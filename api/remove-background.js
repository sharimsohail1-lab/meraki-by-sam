// Background removal via remove.bg API.
// Set REMOVE_BG_API_KEY in Vercel environment variables.
// Free tier: 50 removals/month. https://www.remove.bg/api
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Background removal is not configured. Add REMOVE_BG_API_KEY to Vercel environment variables (get a free key at remove.bg).'
    });
  }

  const { image_b64 } = req.body;
  if (!image_b64) return res.status(400).json({ error: 'image_b64 required' });

  // Strip the data URL prefix if present — remove.bg wants raw base64
  const base64 = image_b64.replace(/^data:image\/[^;]+;base64,/, '');

  try {
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: base64,
        size: 'auto',         // best quality within free tier limits
        format: 'png',        // always PNG for transparency
        type: 'product',      // product mode — best for garments
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `remove.bg error ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.errors?.[0]?.title || errorMsg;
      } catch (_) {}
      return res.status(response.status).json({ error: errorMsg });
    }

    const pngBuffer = await response.arrayBuffer();
    const base64Result = Buffer.from(pngBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64Result}`;

    return res.status(200).json({ cleanedImage: dataUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
