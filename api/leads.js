import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-meraki-pin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();

  // GET — admin list (requires PIN header)
  if (req.method === 'GET') {
    const adminPin = process.env.MERAKI_ADMIN_PIN;
    if (adminPin) {
      const supplied = req.headers['x-meraki-pin'];
      if (!supplied || supplied !== adminPin) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
    const { data, error } = await supabase
      .from('customer_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  }

  // POST — public signup (upsert by phone+source_event)
  if (req.method === 'POST') {
    const { name, phone, state, email, preferred_sizes, preferred_contact, interests, has_purchased, notes, source, source_event, exhibition_id } = req.body || {};

    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    const payload = {
      name: name.trim(),
      phone: phone?.trim() || null,
      state: state?.trim() || null,
      email: email?.trim() || null,
      preferred_sizes: Array.isArray(preferred_sizes) ? preferred_sizes : [],
      preferred_contact: preferred_contact || null,
      interests: Array.isArray(interests) ? interests : [],
      has_purchased: typeof has_purchased === 'boolean' ? has_purchased : null,
      notes: notes?.trim() || null,
      source: source || 'qr',
      source_event: source_event || "APPNA'26",
      exhibition_id: exhibition_id || null,
      updated_at: new Date().toISOString(),
    };

    // Upsert by phone+source_event if phone provided, else plain insert
    if (payload.phone) {
      const { data: existing } = await supabase
        .from('customer_leads')
        .select('id, notes')
        .eq('phone', payload.phone)
        .eq('source_event', payload.source_event)
        .maybeSingle();

      if (existing) {
        // Preserve original notes if new submission has none
        if (!payload.notes && existing.notes) payload.notes = existing.notes;
        const { data, error } = await supabase
          .from('customer_leads')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ data, updated: true });
      }
    }

    const { data, error } = await supabase
      .from('customer_leads')
      .insert(payload)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data, updated: false });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
