import { createClient } from '@supabase/supabase-js';

// Columns added in later migrations that may not exist if schema cache is stale
const OPTIONAL_COLS = ['size_inventory', 'detail_photos', 'share_blurb', 'is_archived', 'collection_names'];

// All known product columns — used to validate the columns parameter
const KNOWN_PRODUCT_COLS = new Set([
  'id','sku','name','name_ur','category','garment_type','season','colors','occasion','buyer_type',
  'description_en','description_ur','price','cost','status','reserved_for','customer_id',
  'photo','model_photo','ideogram_prompt','caption_en','caption_ur','hashtags','collection_name',
  'exhibition_id','notes','created_at','sold_at','updated_at','size_inventory','detail_photos',
  'share_blurb','is_archived','collection_names','neckline','has_placket','has_dupatta','motifs',
  'story_text','whatsapp_listing','price_card','sharing_angle','catalog_blurb'
]);

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

function safeColumns(raw) {
  if (!raw || raw === '*') return '*';
  // Accept comma-separated list; strip unknown columns to prevent injection
  const requested = raw.split(',').map(c => c.trim()).filter(Boolean);
  const valid = requested.filter(c => KNOWN_PRODUCT_COLS.has(c));
  return valid.length ? valid.join(',') : '*';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Inside try so a null/unparsed body is caught rather than crashing the handler
    const raw = req.method === 'GET' ? req.query : req.body;
    console.log('[db] method:', req.method, '| body type:', typeof raw, '| body null?:', raw == null,
      '| keys:', raw ? Object.keys(raw).join(',') : 'n/a');

    const { table, action, id, data, filter, columns } = raw || {};
    console.log('[db] action:', action, '| table:', table, '| id:', id ?? 'none',
      '| has data:', !!data, '| has filter:', !!filter, '| columns:', columns ? columns.slice(0, 80) : 'none');

    const supabase = getSupabase();

    if (action === 'insert') {
      const payload = stripNulls(data);
      const { data: result, error } = await supabase.from(table).insert(payload).select();
      if (error && isSchemaError(error.message)) {
        console.warn('[db] Schema cache error on insert, retrying without optional cols:', error.message);
        const fallback = stripOptionalCols(payload);
        const { data: r2, error: e2 } = await supabase.from(table).insert(fallback).select();
        if (e2) { console.error('[db] insert fallback error:', e2.message); return res.status(400).json({ error: e2.message }); }
        return res.status(200).json({ data: r2, warning: 'Saved without ' + OPTIONAL_COLS.join('/') + ' — run /api/migrate to fix schema cache' });
      }
      if (error) { console.error('[db] insert error:', error.message); return res.status(400).json({ error: error.message }); }
      return res.status(200).json({ data: result });
    }

    if (action === 'update') {
      const payload = stripNulls(data);
      const { data: result, error } = await supabase.from(table).update(payload).eq('id', id).select();
      if (error && isSchemaError(error.message)) {
        console.warn('[db] Schema cache error on update, retrying without optional cols:', error.message);
        const fallback = stripOptionalCols(payload);
        const { data: r2, error: e2 } = await supabase.from(table).update(fallback).eq('id', id).select();
        if (e2) { console.error('[db] update fallback error:', e2.message); return res.status(400).json({ error: e2.message }); }
        return res.status(200).json({ data: r2, warning: 'Updated without ' + OPTIONAL_COLS.join('/') + ' — run /api/migrate to fix schema cache' });
      }
      if (error) { console.error('[db] update error:', error.message); return res.status(400).json({ error: error.message }); }
      return res.status(200).json({ data: result });
    }

    let query;
    switch (action) {
      case 'select': {
        const cols = safeColumns(columns);
        query = supabase.from(table).select(cols).order('created_at', { ascending: false });
        if (filter) {
          Object.entries(JSON.parse(filter)).forEach(([k, v]) => { query = query.eq(k, v); });
        }
        if (id) query = query.eq('id', id);
        break;
      }
      case 'upsert':
        query = supabase.from(table).upsert(data, { onConflict: 'key' }).select();
        break;
      case 'delete':
        query = supabase.from(table).delete().eq('id', id);
        break;
      default:
        console.error('[db] invalid action received:', JSON.stringify(action), '| table:', JSON.stringify(table));
        return res.status(400).json({ error: 'Invalid action: ' + JSON.stringify(action) });
    }

    const { data: result, error } = await query;
    if (error) {
      console.error('[db] query error on', action, table, ':', error.message, '| code:', error.code);
      // PostgreSQL statement_timeout (57014) → 504 so client can retry with a useful message
      if (error.code === '57014') {
        return res.status(504).json({ error: 'Query timed out — inventory is too large to load right now. Please retry.' });
      }
      return res.status(400).json({ error: error.message });
    }
    console.log('[db] ok:', action, table, '| rows:', Array.isArray(result) ? result.length : 'n/a');
    return res.status(200).json({ data: result });

  } catch (err) {
    console.error('[db] caught exception:', err.message, err.stack?.split('\n')[1] || '');
    return res.status(500).json({ error: err.message });
  }
}
