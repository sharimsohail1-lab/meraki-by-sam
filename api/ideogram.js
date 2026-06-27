export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: proxy an image URL to avoid CORS restrictions on Ideogram CDN
  if (req.method === 'GET') {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url param' });
    try {
      const imgResp = await fetch(url);
      const buffer = await imgResp.arrayBuffer();
      const contentType = imgResp.headers.get('content-type') || 'image/png';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(Buffer.from(buffer));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.IDEOGRAM_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Ideogram API key not configured' });

  const { text_prompt, aspect_ratio, rendering_speed, image_b64, image_weight } = req.body;

  if (!text_prompt) return res.status(400).json({ error: 'text_prompt required' });

  // Build shared image buffer if photo provided
  let imageBuffer = null, mimeType = 'image/jpeg', ext = 'jpg';
  if (image_b64) {
    const base64Data = image_b64.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(base64Data, 'base64');
    const prefix = image_b64.split(';')[0];
    mimeType = prefix.startsWith('data:') ? prefix.slice(5) : 'image/jpeg';
    ext = mimeType === 'image/png' ? 'png' : 'jpg';
  }

  // If we have a photo, try remix endpoints in order
  if (imageBuffer) {
    // Try 1: ideogram-v4 remix
    const r1 = await tryRemixV4({ apiKey, text_prompt, aspect_ratio, imageBuffer, mimeType, ext, image_weight });
    if (r1.ok) return res.status(200).json(r1.data);
    console.error('v4 remix failed:', r1.error);

    // Try 2: older /remix endpoint (v2 model, proven to work)
    const r2 = await tryRemixV2({ apiKey, text_prompt, aspect_ratio, imageBuffer, mimeType, ext, image_weight });
    if (r2.ok) return res.status(200).json(r2.data);
    console.error('v2 remix failed:', r2.error);

    // Both remix attempts failed — return the error so Sam sees it
    return res.status(502).json({ error: `Image remix unavailable. v4: ${r1.error} | v2: ${r2.error}` });
  }

  // No photo — text-only generate
  try {
    const boundary = 'boundary' + Date.now();
    const parts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="text_prompt"\r\n\r\n${text_prompt}`
    ];
    if (aspect_ratio) parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="aspect_ratio"\r\n\r\n${aspect_ratio}`);
    if (rendering_speed) parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="rendering_speed"\r\n\r\n${rendering_speed}`);
    const body = parts.join('\r\n') + `\r\n--${boundary}--\r\n`;

    const response = await fetch('https://api.ideogram.ai/v1/ideogram-v4/generate', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Api-Key': apiKey },
      body
    });
    const data = await response.json();
    return res.status(response.ok ? 200 : 502).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function buildRemixMultipart({ boundary, text_prompt, aspect_ratio, imageBuffer, mimeType, ext, weight }) {
  const weightVal = weight ?? 0.7;
  const textPart = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="text_prompt"\r\n\r\n${text_prompt}\r\n`);
  const weightPart = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image_weight"\r\n\r\n${weightVal}\r\n`);
  const aspectPart = aspect_ratio
    ? Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="aspect_ratio"\r\n\r\n${aspect_ratio}\r\n`)
    : Buffer.alloc(0);
  const imageHeader = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image_file"; filename="garment.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
  const closing = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([textPart, weightPart, aspectPart, imageHeader, imageBuffer, closing]);
}

async function tryRemixV4({ apiKey, text_prompt, aspect_ratio, imageBuffer, mimeType, ext, image_weight }) {
  try {
    const weight = image_weight ?? 0.7;
    // v4 remix expects JSON with base64 image, not multipart
    const response = await fetch('https://api.ideogram.ai/v1/ideogram-v4/remix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Api-Key': apiKey },
      body: JSON.stringify({
        text_prompt,
        aspect_ratio: aspect_ratio || 'ASPECT_2_3',
        image_weight: weight,
        image_file: imageBuffer.toString('base64')
      })
    });
    const data = await response.json();
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}: ${JSON.stringify(data)}` };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function tryRemixV2({ apiKey, text_prompt, aspect_ratio, imageBuffer, mimeType, ext, image_weight }) {
  try {
    const boundary = 'boundary' + Date.now();
    // v2 remix uses image_request JSON field instead of individual fields
    const imageRequest = JSON.stringify({
      prompt: text_prompt,
      aspect_ratio: aspect_ratio || 'ASPECT_2_3',
      image_weight: Math.round((image_weight ?? 0.7) * 100), // v2 uses 0-100
      model: 'V_2'
    });
    const reqPart = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image_request"\r\n\r\n${imageRequest}\r\n`);
    const imageHeader = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image_file"; filename="garment.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
    const closing = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([reqPart, imageHeader, imageBuffer, closing]);

    const response = await fetch('https://api.ideogram.ai/remix', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Api-Key': apiKey },
      body
    });
    const data = await response.json();
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}: ${JSON.stringify(data)}` };
    // v2 response format: { data: [{ url }] }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
