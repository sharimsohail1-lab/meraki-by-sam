import { createClient } from '@supabase/supabase-js';

// Supabase Storage control plane for product imagery.
//
// Image BYTES never pass through this function. The browser asks for a signed
// upload URL and then PUTs directly to Supabase Storage, which keeps uploads clear
// of Vercel's 4.5 MB request ceiling and keeps origin egress off the function.
//
// The service key stays server-side. The browser only ever sees a short-lived
// signed URL scoped to one object key.
//
// Actions:
//   signUpload { key, contentType } -> { signedUrl, token, path, publicUrl }
//   delete     { key }              -> { deleted: true }
//   publicUrl  { key }              -> { publicUrl }

const BUCKET = 'product-images';

// products/{uuid}/{uuid}.{ext} — anything else is rejected so a caller cannot
// reach outside the product namespace or overwrite an unrelated object.
const KEY_PATTERN = /^products\/[0-9a-f-]{36}\/[0-9a-z-]+\.(webp|jpg|jpeg|png)$/i;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

function publicUrlFor(key) {
  const base = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${BUCKET}/${key}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, key, contentType } = req.body || {};
  if (!action) return res.status(400).json({ error: 'Missing action' });

  if (action !== 'publicUrl' && !key) return res.status(400).json({ error: 'Missing key' });
  if (key && !KEY_PATTERN.test(key)) {
    return res.status(400).json({ error: 'Invalid storage key' });
  }

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(503).json({ error: e.message }); }

  try {
    if (action === 'signUpload') {
      if (contentType && !/^image\/(webp|jpeg|png)$/.test(contentType)) {
        return res.status(400).json({ error: 'Unsupported content type' });
      }
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(key);
      if (error) {
        const hint = /not found|bucket/i.test(error.message)
          ? ` — create a public bucket named "${BUCKET}" in Supabase Storage`
          : '';
        return res.status(500).json({ error: error.message + hint });
      }
      return res.status(200).json({
        signedUrl: data.signedUrl,
        token:     data.token,
        path:      data.path,
        publicUrl: publicUrlFor(key),
      });
    }

    if (action === 'delete') {
      const { error } = await supabase.storage.from(BUCKET).remove([key]);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ deleted: true, key });
    }

    if (action === 'publicUrl') {
      if (!key) return res.status(400).json({ error: 'Missing key' });
      return res.status(200).json({ publicUrl: publicUrlFor(key) });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (err) {
    console.error('[storage]', action, err.message);
    return res.status(500).json({ error: err.message });
  }
}
