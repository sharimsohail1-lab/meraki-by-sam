import { createClient } from '@supabase/supabase-js';

// Metadata-only patch for detail_photos JSONB.
// Client sends { productId, metaArray } where metaArray has NO image/cleanedImage fields.
// Server merges into existing DB record so base64 photos are never round-tripped.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Supabase not configured' });

  const { productId, metaArray } = req.body;
  if (!productId || !Array.isArray(metaArray)) {
    return res.status(400).json({ error: 'productId and metaArray required' });
  }

  const supabase = createClient(url, key);

  // Fetch current detail_photos from DB
  const { data: rows, error: fetchErr } = await supabase
    .from('products')
    .select('detail_photos')
    .eq('id', productId)
    .single();

  if (fetchErr) return res.status(400).json({ error: fetchErr.message });

  let existing = [];
  try {
    const raw = rows?.detail_photos;
    existing = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
  } catch (_) { existing = []; }

  // Build id→existing map to preserve image/cleanedImage
  const byId = {};
  existing.forEach(d => { if (d.id) byId[d.id] = d; });

  // Merge: apply client metadata fields, keep server image fields
  const merged = metaArray.map(m => {
    const srv = byId[m.id] || {};
    return {
      ...srv,
      ...m,
      image: srv.image,
      cleanedImage: srv.cleanedImage,
    };
  });

  const value = merged.length ? JSON.stringify(merged) : null;

  const { error: saveErr } = await supabase
    .from('products')
    .update({ detail_photos: value })
    .eq('id', productId);

  if (saveErr) return res.status(400).json({ error: saveErr.message });

  return res.status(200).json({ ok: true });
}
