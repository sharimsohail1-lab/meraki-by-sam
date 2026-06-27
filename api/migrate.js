import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const secret = process.env.MIGRATION_SECRET;
  if (secret && req.headers['x-migration-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase credentials not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const log = [];

  try {
    // Bootstrap migrations table
    const { error: bootErr } = await supabase.rpc('run_sql', {
      query: `CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        run_at TIMESTAMPTZ DEFAULT NOW()
      )`
    });
    if (bootErr) {
      return res.status(500).json({ error: 'Bootstrap failed: ' + bootErr.message, log });
    }

    // Get already-run migrations
    const { data: ran, error: ranErr } = await supabase.from('migrations').select('name');
    if (ranErr) {
      return res.status(500).json({ error: 'Could not read migrations table: ' + ranErr.message, log });
    }
    const ranNames = new Set((ran || []).map(r => r.name));

    // Read migration files in order
    const migrationsDir = join(process.cwd(), 'migrations');
    const files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (ranNames.has(file)) {
        log.push({ file, status: 'skipped (already run)' });
        continue;
      }

      const sql = await readFile(join(migrationsDir, file), 'utf8');
      const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
      let fileOk = true;

      for (const stmt of statements) {
        const { error: stmtErr } = await supabase.rpc('run_sql', { query: stmt });
        if (stmtErr) {
          log.push({ file, status: 'error', statement: stmt.slice(0, 120), error: stmtErr.message });
          fileOk = false;
          break;
        }
      }

      if (fileOk) {
        const { error: insertErr } = await supabase.from('migrations').insert({ name: file });
        if (insertErr) {
          log.push({ file, status: 'sql ok but tracking failed: ' + insertErr.message });
        } else {
          log.push({ file, status: 'applied' });
        }
      }
    }

    // Always attempt schema cache reload — failure here is non-fatal
    const { error: notifyErr } = await supabase.rpc('run_sql', { query: `NOTIFY pgrst, 'reload schema'` });
    if (notifyErr) {
      log.push({ file: 'schema reload', status: 'warning: ' + notifyErr.message });
    } else {
      log.push({ file: 'schema reload', status: 'sent' });
    }

    const hasErrors = log.some(l => l.status?.startsWith('error'));
    return res.status(hasErrors ? 500 : 200).json({ success: !hasErrors, log });

  } catch (err) {
    return res.status(500).json({ error: err.message, log });
  }
}
