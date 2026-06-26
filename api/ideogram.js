export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.IDEOGRAM_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Ideogram API key not configured' });

  try {
    const imageRequest = JSON.stringify(req.body);
    const boundary = 'boundary' + Date.now();
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="image_request"',
      'Content-Type: application/json',
      '',
      imageRequest,
      `--${boundary}--`,
      ''
    ].join('\r\n');

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
