export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: proxy an image URL to avoid browser CORS restrictions
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

  try {
    const { text_prompt, aspect_ratio, rendering_speed, image_b64, image_weight } = req.body;

    // If a garment photo is provided, try remix first, fall back to generate
    if (image_b64) {
      const remixResult = await tryRemix({ apiKey, text_prompt, aspect_ratio, image_b64, image_weight });
      if (remixResult.ok) return res.status(200).json(remixResult.data);
      // Remix failed — fall back to text-only and include a warning
      console.error('Ideogram remix failed, falling back to generate:', remixResult.error);
    }

    // Text-only generate
    const data = await textGenerate({ apiKey, text_prompt, aspect_ratio, rendering_speed });
    return res.status(data.ok ? 200 : 502).json(data.data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function tryRemix({ apiKey, text_prompt, aspect_ratio, image_b64, image_weight }) {
  try {
    const base64Data = image_b64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const prefix = image_b64.split(';')[0];
    const mimeType = prefix.startsWith('data:') ? prefix.slice(5) : 'image/jpeg';
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const weight = image_weight ?? 0.4;

    const boundary = 'boundary' + Date.now();

    const textPart = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="text_prompt"\r\n\r\n${text_prompt}\r\n`
    );
    const weightPart = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image_weight"\r\n\r\n${weight}\r\n`
    );
    const aspectPart = aspect_ratio ? Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="aspect_ratio"\r\n\r\n${aspect_ratio}\r\n`
    ) : Buffer.alloc(0);
    const imageHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image_file"; filename="garment.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    );
    const closing = Buffer.from(`\r\n--${boundary}--\r\n`);

    const bodyBuffer = Buffer.concat([textPart, weightPart, aspectPart, imageHeader, imageBuffer, closing]);

    const response = await fetch('https://api.ideogram.ai/v1/ideogram-v4/remix', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Api-Key': apiKey
      },
      body: bodyBuffer
    });

    const data = await response.json();
    if (!response.ok) return { ok: false, error: JSON.stringify(data) };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function textGenerate({ apiKey, text_prompt, aspect_ratio, rendering_speed }) {
  const boundary = 'boundary' + Date.now();
  const parts = [];
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="text_prompt"\r\n\r\n${text_prompt}`);
  if (aspect_ratio) parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="aspect_ratio"\r\n\r\n${aspect_ratio}`);
  if (rendering_speed) parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="rendering_speed"\r\n\r\n${rendering_speed}`);
  const body = parts.join('\r\n') + `\r\n--${boundary}--\r\n`;

  const response = await fetch('https://api.ideogram.ai/v1/ideogram-v4/generate', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Api-Key': apiKey
    },
    body
  });
  const data = await response.json();
  return { ok: response.ok, data };
}
