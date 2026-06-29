export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const pin = process.env.MERAKI_ADMIN_PIN;

  // If env var is not set, PIN gate is disabled — app works without PIN.
  // Set MERAKI_ADMIN_PIN in Vercel to enable protection.
  if (!pin) {
    console.warn('[admin-auth] MERAKI_ADMIN_PIN not set — gate disabled');
    return res.status(200).json({ ok: true, gateDisabled: true });
  }

  const { pin: submitted } = req.body || {};
  if (!submitted) return res.status(400).json({ ok: false, error: 'PIN required' });
  if (String(submitted).trim() !== String(pin).trim()) {
    return res.status(401).json({ ok: false, error: 'Incorrect PIN' });
  }

  return res.status(200).json({ ok: true });
}
