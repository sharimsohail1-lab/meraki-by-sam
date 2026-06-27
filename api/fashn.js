// FASHN virtual try-on API proxy.
// POST  /api/fashn  { model_image, garment_image, category?, mode?, garment_photo_type? }
//   → { id: "pred_xxx" }          (prediction started; client polls for status)
// GET   /api/fashn?id=pred_xxx
//   → { id, status, output?, error? }   (output is array of CDN image URLs when completed)
//
// Auth: FASHN_API_KEY environment variable (never exposed to frontend).

const FASHN_BASE = 'https://api.fashn.ai/v1';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'FASHN_API_KEY not configured' });

  const authHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  // ── GET: poll prediction status ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing prediction id' });
    try {
      const r = await fetch(`${FASHN_BASE}/status/${id}`, { headers: authHeaders });
      const data = await r.json();
      return res.status(r.ok ? 200 : r.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST: start prediction ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { model_image, garment_image, category, mode, garment_photo_type, prompt } = req.body;

    if (!model_image || !garment_image) {
      return res.status(400).json({ error: 'model_image and garment_image are required' });
    }

    // category: tops preserves kameez as a long tunic, not a Western one-piece dress
    const resolvedCategory = category || 'tops';
    const inputs = {
      model_image: model_image,
      garment_image: garment_image,
      category: resolvedCategory === 'auto' ? 'tops' : resolvedCategory,
      garment_photo_type: garment_photo_type || 'flat-lay',
      mode: mode || 'balanced',
      segmentation_free: true,
      num_samples: 1
    };
    if (prompt) inputs.prompt = prompt;

    const payload = {
      model_name: 'tryon-v1.6',
      inputs
    };

    try {
      console.log('[fashn] Starting prediction — category:', payload.inputs.category, 'mode:', payload.inputs.mode);
      const r = await fetch(`${FASHN_BASE}/run`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
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
