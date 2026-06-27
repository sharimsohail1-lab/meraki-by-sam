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

  try {
    // Ensure migrations table exists first (bootstrap)
    await supabase.rpc('run_sql', {
      query: `CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        run_at TIMESTAMPTZ DEFAULT NOW()
      )`
    });

    // Get already-run migrations
    const { data: ran } = await supabase.from('migrations').select('name');
    const ranNames = new Set((ran || []).map(r => r.name));

    // Read migration files in order
    const migrationsDir = join(process.cwd(), 'migrations');
    const files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();

    const results = [];
    for (const file of files) {
      if (ranNames.has(file)) {
        results.push({ file, status: 'skipped (already run)' });
        continue;
      }
      const sql = await readFile(join(migrationsDir, file), 'utf8');
      // Split on semicolons and run each statement
      const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        await supabase.rpc('run_sql', { query: stmt });
      }
      await supabase.from('migrations').insert({ name: file });
      results.push({ file, status: 'applied' });
    }

    return res.status(200).json({ success: true, results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
