import { createClient } from '@supabase/supabase-js';

// Columns added in later migrations that may not exist if schema cache is stale
const OPTIONAL_COLS = ['size_inventory', 'detail_photos', 'share_blurb', 'is_archived'];

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

function isSchemaError(msg) {
  return msg && (msg.includes('schema cache') || msg.includes('Could not find'));
}

function stripNulls(data) {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined));
}

function stripOptionalCols(data) {
  return Object.fromEntries(Object.entries(data).filter(([k]) => !OPTIONAL_COLS.includes(k)));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { table, action, id, data, filter } = req.method === 'GET' ? req.query : req.body;

  try {
    const supabase = getSupabase();

    if (action === 'insert') {
      const payload = stripNulls(data);
      const { data: result, error } = await supabase.from(table).insert(payload).select();
      if (error && isSchemaError(error.message)) {
        // Schema cache stale — retry without optional columns
        console.warn('[db] Schema cache error on insert, retrying without optional cols:', error.message);
        const fallback = stripOptionalCols(payload);
        const { data: r2, error: e2 } = await supabase.from(table).insert(fallback).select();
        if (e2) return res.status(400).json({ error: e2.message });
        return res.status(200).json({ data: r2, warning: 'Saved without ' + OPTIONAL_COLS.join('/') + ' — run /api/migrate to fix schema cache' });
      }
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ data: result });
    }

    if (action === 'update') {
      const payload = stripNulls(data);
      const { data: result, error } = await supabase.from(table).update(payload).eq('id', id).select();
      if (error && isSchemaError(error.message)) {
        console.warn('[db] Schema cache error on update, retrying without optional cols:', error.message);
        const fallback = stripOptionalCols(payload);
        const { data: r2, error: e2 } = await supabase.from(table).update(fallback).eq('id', id).select();
        if (e2) return res.status(400).json({ error: e2.message });
        return res.status(200).json({ data: r2, warning: 'Updated without ' + OPTIONAL_COLS.join('/') + ' — run /api/migrate to fix schema cache' });
      }
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ data: result });
    }

    let query;
    switch (action) {
      case 'select':
        query = supabase.from(table).select('*').order('created_at', { ascending: false });
        if (filter) {
          Object.entries(JSON.parse(filter)).forEach(([k, v]) => { query = query.eq(k, v); });
        }
        break;
      case 'upsert':
        query = supabase.from(table).upsert(data, { onConflict: 'key' }).select();
        break;
      case 'delete':
        query = supabase.from(table).delete().eq('id', id);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const { data: result, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data: result });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
