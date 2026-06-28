import { createClient } from '@supabase/supabase-js';

// Metadata-only patch for detail_photos JSONB.
// Client sends { productId, metaArray } where metaArray has NO image/cleanedImage fields.
// Server iterates its own existing records and patches only metadata fields.
// Images are NEVER sourced from the client payload — only from the existing DB record.
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

  // Build lookup maps from client metadata (no images)
  const incomingById = {};
  const incomingBySlot = {};
  metaArray.forEach(m => {
    if (m.id) incomingById[m.id] = m;
    if (m.slot) incomingBySlot[m.slot] = m;
  });

  console.log('[DETAIL META SERVER] before merge', {
    productId,
    existing: existing.map(d => ({
      id: d.id,
      label: d.label,
      slot: d.slot,
      hasImage: !!d.image,
      imageLength: d.image?.length || 0,
      hasCleanedImage: !!d.cleanedImage,
      useAsInset: d.useAsInset,
    })),
    incoming: metaArray.map(d => ({
      id: d.id,
      label: d.label,
      hasImage: !!d.image,
      hasCleanedImage: !!d.cleanedImage,
      useAsInset: d.useAsInset,
    })),
  });

  // Iterate EXISTING (server) records — never lose an image.
  // Match incoming metadata by ID first, then slot, then positional index.
  const merged = existing.map((srv, idx) => {
    const incoming = (srv.id && incomingById[srv.id])
      || (srv.slot && incomingBySlot[srv.slot])
      || metaArray[idx];
    if (!incoming) return srv;
    return {
      ...srv,                                        // preserve image, cleanedImage, all server fields
      useAsInset: incoming.useAsInset !== undefined ? incoming.useAsInset : srv.useAsInset,
      insetOrder: incoming.insetOrder !== undefined ? incoming.insetOrder : srv.insetOrder,
      label: incoming.label ?? srv.label,
      slot: incoming.slot ?? srv.slot,
      id: srv.id || incoming.id,                    // assign ID if server record lacked one
    };
  });

  console.log('[DETAIL META SERVER] after merge', {
    productId,
    merged: merged.map(d => ({
      id: d.id,
      label: d.label,
      hasImage: !!d.image,
      imageLength: d.image?.length || 0,
      hasCleanedImage: !!d.cleanedImage,
      useAsInset: d.useAsInset,
    })),
  });

  const value = merged.length ? JSON.stringify(merged) : null;

  const { error: saveErr } = await supabase
    .from('products')
    .update({ detail_photos: value })
    .eq('id', productId);

  if (saveErr) return res.status(400).json({ error: saveErr.message });

  return res.status(200).json({ ok: true });
}
