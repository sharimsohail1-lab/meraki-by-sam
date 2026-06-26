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
    const { text_prompt, aspect_ratio, rendering_speed } = req.body;

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
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
