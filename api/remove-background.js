// Background removal via remove.bg API.
// Set REMOVE_BG_API_KEY in Vercel environment variables.
// Free tier: 50 removals/month. https://www.remove.bg/api
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });

  console.log('[REMOVE BG API START]', {
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    hasImageB64: !!req.body?.image_b64,
    imageLength: req.body?.image_b64?.length || 0,
    startsWithDataImage: req.body?.image_b64?.startsWith?.('data:image/') ?? false,
  });

  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    console.warn('[REMOVE BG] REMOVE_BG_API_KEY not set');
    return res.status(503).json({
      error: 'MISSING_API_KEY',
      message: 'Background cleanup is not configured. Ask your developer to add REMOVE_BG_API_KEY to the server.',
    });
  }

  const { image_b64 } = req.body || {};
  if (!image_b64) {
    console.warn('[REMOVE BG] image_b64 missing from request body');
    return res.status(400).json({ error: 'MISSING_IMAGE', message: 'No image was provided to background cleanup.' });
  }
  if (!image_b64.startsWith('data:image/')) {
    console.warn('[REMOVE BG] image_b64 does not look like a data URL', { prefix: image_b64.slice(0, 30) });
    return res.status(400).json({ error: 'INVALID_IMAGE', message: 'Image data is not in the expected format.' });
  }

  // Strip the data URL prefix — remove.bg wants raw base64
  const base64 = image_b64.replace(/^data:image\/[^;]+;base64,/, '');

  console.log('[REMOVE BG BEFORE PROVIDER]', {
    hasApiKey: true,
    imageLength: base64.length,
  });

  try {
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: base64,
        size: 'auto',
        format: 'png',
        type: 'product',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `remove.bg error ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.errors?.[0]?.title || errorMsg;
      } catch (_) {}
      console.warn('[REMOVE BG] provider error', { status: response.status, message: errorMsg });
      return res.status(response.status).json({ error: 'REMOVE_BG_FAILED', message: errorMsg });
    }

    const pngBuffer = await response.arrayBuffer();
    const base64Result = Buffer.from(pngBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64Result}`;

    console.log('[REMOVE BG] success', { outputLength: base64Result.length });
    return res.status(200).json({ cleanedImage: dataUrl });
  } catch (err) {
    console.error('[REMOVE BG] unexpected error', { message: err.message });
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
}
