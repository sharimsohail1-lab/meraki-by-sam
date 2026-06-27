import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { table, action, id, data, filter } = req.method === 'GET' ? req.query : req.body;

  try {
    const supabase = getSupabase();
    let query;

    switch (action) {
      case 'select':
        query = supabase.from(table).select('*').order('created_at', { ascending: false });
        if (filter) {
          Object.entries(JSON.parse(filter)).forEach(([k, v]) => { query = query.eq(k, v); });
        }
        break;
      case 'insert': {
        // Strip null/undefined so unrun migrations don't cause "column not found" errors
        const insertData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined));
        query = supabase.from(table).insert(insertData).select();
        break;
      }
      case 'update': {
        // Strip null/undefined so unrun migrations don't cause "column not found" errors
        const updateData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined));
        query = supabase.from(table).update(updateData).eq('id', id).select();
        break;
      }
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
