import { createClient } from '@supabase/supabase-js';

// Columns added in later migrations that may not exist if schema cache is stale
const OPTIONAL_COLS = ['size_inventory', 'detail_photos', 'share_blurb', 'is_archived', 'collection_names'];

// Table-aware column allowlists — prevents arbitrary SQL injection via columns param
const ALLOWED_COLUMNS_BY_TABLE = {
  products: new Set([
    'id','sku','name','name_ur','category','garment_type','season','colors','occasion','buyer_type',
    'description_en','description_ur','price','cost','status','reserved_for','customer_id',
    'photo','model_photo','ideogram_prompt','caption_en','caption_ur','hashtags','collection_name',
    'exhibition_id','notes','created_at','sold_at','updated_at','size_inventory','detail_photos',
    'share_blurb','is_archived','collection_names','neckline','has_placket','has_dupatta','motifs',
    'story_text','whatsapp_listing','price_card','sharing_angle','catalog_blurb'
  ]),
  exh_items: new Set([
    'id','exhibition_id','name','photo','price_usd','cost_pkr',
    'size_inventory','notes','status','created_at','updated_at'
  ]),
  exh_sales: new Set([
    'id','exhibition_id','item_id','size','quantity',
    'sold_price_usd','payment_method','notes','voided','created_at'
  ]),
  exhibition_items: new Set([
    'id','exhibition_id','product_id','created_at'
  ]),
  exhibitions: new Set([
    'id','name','location','date','status','notes','created_at','updated_at'
  ]),
  model_templates: new Set([
    'id','def_id','name','category','group_name','subtype','pose_notes','prompt',
    'image','source_provider','is_default','status','created_at'
  ]),
};

// Backwards-compat alias — used by products boot
const KNOWN_PRODUCT_COLS = ALLOWED_COLUMNS_BY_TABLE.products;

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

// Returns the validated column string, or throws with a safe message listing only
// the invalid column names and table — never logs or exposes row contents.
// When no columns param is supplied (undefined / '*'), returns '*' to preserve
// legacy callers that rely on full-row selects.
function safeColumns(raw, table) {
  if (!raw || raw === '*') return '*';
  const allowlist = ALLOWED_COLUMNS_BY_TABLE[table] || KNOWN_PRODUCT_COLS;
  const requested = raw.split(',').map(c => c.trim()).filter(Boolean);
  const rejected = requested.filter(c => !allowlist.has(c));
  if (rejected.length) {
    // Reject the entire request — do not silently strip or fall back to *.
    throw new RangeError(`Invalid columns for table "${table}": ${rejected.join(', ')}`);
  }
  return requested.join(',');
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
        let cols;
        try { cols = safeColumns(columns, table); }
        catch(colErr) {
          console.warn('[db] column validation failed:', colErr.message);
          return res.status(400).json({ error: colErr.message });
        }
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
