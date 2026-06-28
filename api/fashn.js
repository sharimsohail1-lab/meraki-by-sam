// FASHN virtual try-on API proxy.
// POST  /api/fashn  { model_image, garment_image, category?, mode?, garment_photo_type? }
//   → { id: "pred_xxx" }          (prediction started; client polls for status)
// GET   /api/fashn?id=pred_xxx
//   → { id, status, output?, error? }   (output is array of CDN image URLs when completed)
//
// Auth: FASHN_API_KEY environment variable (never exposed to frontend).
//
// FASHN API requires multipart/form-data when images are base64 data URLs.
// Images that are https:// URLs can also be passed as plain string form fields.

const FASHN_BASE = 'https://api.fashn.ai/v1';

function base64ToBuffer(dataUrl) {
  const comma = dataUrl.indexOf(',');
  return Buffer.from(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl, 'base64');
}

function getMime(dataUrl) {
  const m = dataUrl.match(/^data:([^;]+);/);
  return m ? m[1] : 'image/jpeg';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'FASHN_API_KEY not configured' });

  const authHeader = { 'Authorization': `Bearer ${apiKey}` };

  // ── GET: poll prediction status ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing prediction id' });
    try {
      const r = await fetch(`${FASHN_BASE}/status/${id}`, { headers: authHeader });
      const data = await r.json();
      return res.status(r.ok ? 200 : r.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST: start prediction ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { model_image, garment_image, category, mode, garment_photo_type } = req.body;

    if (!model_image || !garment_image) {
      return res.status(400).json({ error: 'model_image and garment_image are required' });
    }

    const resolvedCategory = (category === 'auto' || !category) ? 'tops' : category;

    try {
      // FASHN API requires multipart/form-data (images as file blobs or URL strings).
      // Do NOT set Content-Type manually — fetch sets the correct multipart boundary.
      const form = new FormData();

      const appendImage = (key, value) => {
        if (value.startsWith('data:')) {
          const buf = base64ToBuffer(value);
          const mime = getMime(value);
          const ext = mime.split('/')[1] || 'jpg';
          form.append(key, new Blob([buf], { type: mime }), `${key}.${ext}`);
        } else {
          // Plain URL — pass as string
          form.append(key, value);
        }
      };

      appendImage('model_image', model_image);
      appendImage('garment_image', garment_image);
      form.append('category', resolvedCategory);
      form.append('garment_photo_type', garment_photo_type || 'flat-lay');
      form.append('mode', mode || 'balanced');
      form.append('segmentation_free', 'true');
      form.append('num_samples', '1');

      console.log('[fashn] Starting prediction — category:', resolvedCategory, 'mode:', mode || 'balanced');
      const r = await fetch(`${FASHN_BASE}/run`, {
        method: 'POST',
        headers: authHeader,
        body: form
      });
      const data = await r.json();
      if (!r.ok) {
        console.error('[fashn] run failed:', r.status, JSON.stringify(data));
        return res.status(r.status).json({ error: data?.error || data?.detail || 'FASHN run failed' });
      }
      console.log('[fashn] Prediction started:', data.id);
      return res.status(200).json({ id: data.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
