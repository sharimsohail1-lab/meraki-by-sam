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
    const { id, _rid } = req.query; // _rid = optional frontend correlation id
    if (!id) return res.status(400).json({ error: 'Missing prediction id' });
    try {
      const r = await fetch(`${FASHN_BASE}/status/${id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      const upstreamContentType   = r.headers.get('content-type') || 'unknown';
      const upstreamContentLength = r.headers.get('content-length') || 'unknown';
      console.log('[fashn poll] rid:', _rid || 'none', '| id:', id, '| upstream status:', r.status,
        '| content-type:', upstreamContentType, '| content-length:', upstreamContentLength);

      const data = await r.json();

      // Log response shape and size without exposing image data.
      const _outputType = Array.isArray(data.output)
        ? (data.output[0]?.startsWith?.('data:') ? 'base64-data-url' : 'url-array')
        : (typeof data.output === 'string' ? (data.output.startsWith('data:') ? 'base64-data-url' : 'url-string') : typeof data.output);
      const _outputSample = Array.isArray(data.output) ? data.output[0] : data.output;
      console.log('[fashn poll] status:', data.status, '| output type:', _outputType,
        '| output[0] length:', _outputSample?.length ?? 'n/a',
        '| output[0] prefix:', typeof _outputSample === 'string' ? _outputSample.slice(0, 60) : 'n/a',
        '| error:', data.error ?? 'none', '| response keys:', Object.keys(data).join(','));

      if (!r.ok) {
        return res.status(r.status).json({ error: data?.error || data?.detail || `FASHN status ${r.status}`, _upstream: data });
      }

      if (data.status === 'completed') {
        // Extract only the output URL — never proxy raw image bytes or large base64 back through Vercel.
        // FASHN returns CDN URLs; if output is unexpectedly base64 that is logged above for diagnosis.
        const _raw = Array.isArray(data.output) ? data.output[0] : data.output;
        console.log('[fashn poll] completed — output_url length:', _raw?.length ?? 0,
          '| is data url:', typeof _raw === 'string' && _raw.startsWith('data:'));
        return res.status(200).json({ id: data.id, status: 'completed', output_url: _raw });
      }

      // In-progress or failed — return status/error only, no large fields.
      return res.status(200).json({ id: data.id, status: data.status, error: data.error ?? null });
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

    // Redacted diagnostics — never logs base64 content.
    const _mimeOf = v => (typeof v === 'string' ? (v.match(/^data:([^;]+);base64,/) || [])[1] ?? (v.startsWith('https://') ? 'https-url' : v.startsWith('blob:') ? 'blob-url' : 'unknown') : typeof v);
    console.log('[fashn] received payload fields:', {
      model_image:    { type: typeof model_image,   mime: _mimeOf(model_image),   prefix: model_image?.slice(0,32),   length: model_image?.length,   hasWhitespace: typeof model_image === 'string' && /\s/.test(model_image.slice(32)) },
      garment_image:  { type: typeof garment_image, mime: _mimeOf(garment_image), prefix: garment_image?.slice(0,32), length: garment_image?.length, hasWhitespace: typeof garment_image === 'string' && /\s/.test(garment_image.slice(32)) },
      category:       resolvedCategory,
      garment_photo_type: garment_photo_type || 'flat-lay',
      mode:           mode || 'balanced',
    });

    try {
      const payload = {
        model_name: 'tryon-v1.6',
        inputs: {
          model_image,
          garment_image,
          category: resolvedCategory,
          garment_photo_type: garment_photo_type || 'flat-lay',
          mode: mode || 'balanced',
          segmentation_free: true,
          num_samples: 1
        }
      };

      console.log('[fashn] upstream payload fields:', {
        model_name: payload.model_name,
        inputs: {
          model_image:    { mime: _mimeOf(payload.inputs.model_image),   length: payload.inputs.model_image?.length },
          garment_image:  { mime: _mimeOf(payload.inputs.garment_image), length: payload.inputs.garment_image?.length },
          category:       payload.inputs.category,
          garment_photo_type: payload.inputs.garment_photo_type,
          mode:           payload.inputs.mode,
        }
      });

      const r = await fetch(`${FASHN_BASE}/run`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (!r.ok) {
        // Return the complete FASHN error response so the client can log all fields.
        console.error('[fashn] run failed:', r.status, 'keys:', Object.keys(data), JSON.stringify(data));
        return res.status(r.status).json(data);
      }
      console.log('[fashn] Prediction started:', data.id);
      return res.status(200).json({ id: data.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
