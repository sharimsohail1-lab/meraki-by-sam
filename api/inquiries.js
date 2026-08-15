import { createClient } from '@supabase/supabase-js';

// Admin-only access to website inquiries.
//
// The inquiry schema is owned by the website and already exists in production.
// Nothing here creates, alters or reconciles it, and neither
// create_website_inquiry RPC is called — the app only reads inquiries and moves
// them through their status.
//
// This is a narrow route on purpose. /api/db is a generic CRUD proxy with an
// arbitrary column allowlist, which is the wrong shape for customer contact
// details: it would let any caller read every column of every inquiry and write
// any field. The only mutation exposed here is status, restricted to three
// values, and the only reads are the two shapes the inbox actually needs.
//
// Routes (all require the admin PIN when MERAKI_ADMIN_PIN is set):
//   GET  /api/inquiries            -> list, newest first, with item counts
//   GET  /api/inquiries?id=<uuid>  -> one inquiry with its items
//   POST /api/inquiries            -> { id, status } status change only

const VALID_STATUSES = ['new', 'contacted', 'closed'];

// Only what the inbox renders. Excludes nothing sensitive today, but naming the
// columns means a column added to the website's schema later cannot leak into
// the admin client without a deliberate change here.
const INQUIRY_COLS =
  'id,created_at,updated_at,source,customer_name,phone,email,state,preferred_size,note,status';

const ITEM_COLS =
  'id,inquiry_id,product_id,product_slug,product_sku,product_name,requested_size,price_snapshot,sort_order,created_at';

// A bounded window. The inbox is a working queue, not an archive browser, and an
// unbounded select would grow into a timeout as inquiries accumulate.
const LIST_LIMIT = 300;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

// Same gate as /api/leads: the PIN travels in a header and is compared
// server-side. When MERAKI_ADMIN_PIN is unset the gate is disabled, matching
// /api/admin-auth, so a deployment without the variable still works.
function authorized(req) {
  const adminPin = process.env.MERAKI_ADMIN_PIN;
  if (!adminPin) return true;
  const supplied = req.headers['x-meraki-pin'];
  return !!supplied && supplied === adminPin;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-meraki-pin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(503).json({ error: e.message }); }

  try {
    if (req.method === 'GET') {
      const { id } = req.query || {};

      // ── Detail: one inquiry and its items. Two queries, never per-item. ──
      if (id) {
        if (!UUID_RE.test(String(id))) return res.status(400).json({ error: 'Invalid inquiry reference' });

        const { data: inq, error: inqErr } = await supabase
          .from('inquiries').select(INQUIRY_COLS).eq('id', id).maybeSingle();
        if (inqErr) throw inqErr;
        if (!inq) return res.status(404).json({ error: 'Inquiry not found' });

        const { data: items, error: itemErr } = await supabase
          .from('inquiry_items').select(ITEM_COLS)
          .eq('inquiry_id', id)
          .order('sort_order', { ascending: true });
        if (itemErr) throw itemErr;

        return res.status(200).json({ data: { ...inq, items: items || [] } });
      }

      // ── List: exactly two queries regardless of how many inquiries there are.
      // The items query is a single `in` over the page of inquiry ids, and the
      // per-inquiry count and first product are folded in below. Product images
      // are NOT fetched here: the client already holds every product_images row
      // from boot and resolves them locally, so enrichment costs no queries. ──
      const { data: inquiries, error: listErr } = await supabase
        .from('inquiries').select(INQUIRY_COLS)
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT);
      if (listErr) throw listErr;

      const rows = inquiries || [];
      let byInquiry = {};
      if (rows.length) {
        const { data: items, error: itemsErr } = await supabase
          .from('inquiry_items')
          .select('inquiry_id,product_id,product_name,product_sku,sort_order')
          .in('inquiry_id', rows.map(r => r.id))
          .order('sort_order', { ascending: true });
        if (itemsErr) throw itemsErr;
        (items || []).forEach(it => {
          const bucket = byInquiry[it.inquiry_id] || (byInquiry[it.inquiry_id] = { count: 0, first: null });
          bucket.count++;
          if (!bucket.first) bucket.first = it;   // already ordered by sort_order
        });
      }

      const data = rows.map(r => {
        const b = byInquiry[r.id] || { count: 0, first: null };
        return { ...r, item_count: b.count, first_item: b.first };
      });

      return res.status(200).json({
        data,
        new_count: data.filter(r => r.status === 'new').length,
      });
    }

    // ── Status change. The ONLY write this route accepts. ──
    if (req.method === 'POST') {
      const { id, status } = req.body || {};
      if (!id || !UUID_RE.test(String(id))) return res.status(400).json({ error: 'Invalid inquiry reference' });
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Only these two columns are ever written. There is deliberately no path
      // here that takes a column name or a data object from the caller.
      const { data, error } = await supabase
        .from('inquiries')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(INQUIRY_COLS);
      if (error) throw error;
      if (!data || !data.length) return res.status(404).json({ error: 'Inquiry not found' });

      return res.status(200).json({ data: data[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    // The underlying message is logged but never returned — it can name tables
    // and constraints, which the admin client has no use for.
    console.error('[inquiries]', req.method, err.message);
    return res.status(500).json({ error: 'Could not reach inquiries right now.' });
  }
}
