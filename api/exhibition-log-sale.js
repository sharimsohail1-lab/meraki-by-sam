import { createClient } from '@supabase/supabase-js';

// Atomic exhibition sale logger.
// Re-fetches current inventory from DB before writing, so stale clients
// cannot accidentally oversell when two people use the app simultaneously.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Supabase not configured' });

  const { exhibitionId, itemId, size, quantity, soldPriceUsd, paymentMethod, notes } = req.body || {};

  if (!exhibitionId || !itemId || !size || !quantity || !soldPriceUsd) {
    return res.status(400).json({ error: 'Missing required fields: exhibitionId, itemId, size, quantity, soldPriceUsd' });
  }
  if (quantity < 1 || !Number.isInteger(quantity)) {
    return res.status(400).json({ error: 'Quantity must be a positive integer' });
  }

  const supabase = createClient(url, key);

  // Fetch fresh inventory from DB — ignores whatever the client thinks is left.
  const { data: itemRows, error: fetchErr } = await supabase
    .from('exh_items')
    .select('*')
    .eq('id', itemId)
    .eq('exhibition_id', exhibitionId)
    .single();

  if (fetchErr || !itemRows) {
    return res.status(404).json({ error: 'Exhibition item not found' });
  }

  const inv = itemRows.size_inventory || {};
  const currentStock = Number(inv[size]) || 0;

  if (currentStock < quantity) {
    return res.status(409).json({
      error: `Only ${currentStock} left in size ${size}. Refresh inventory and try again.`,
      currentStock,
    });
  }

  // Decrement inventory.
  const newInv = { ...inv, [size]: currentStock - quantity };
  const now = new Date().toISOString();

  const { data: updatedItem, error: updateErr } = await supabase
    .from('exh_items')
    .update({ size_inventory: newInv, updated_at: now })
    .eq('id', itemId)
    .select()
    .single();

  if (updateErr) {
    return res.status(500).json({ error: 'Could not update inventory: ' + updateErr.message });
  }

  // Insert sale record.
  const { data: saleRow, error: saleErr } = await supabase
    .from('exh_sales')
    .insert({
      exhibition_id: exhibitionId,
      item_id: itemId,
      size,
      quantity,
      sold_price_usd: soldPriceUsd,
      payment_method: paymentMethod || 'Unaccounted',
      notes: notes || null,
      voided: false,
    })
    .select()
    .single();

  if (saleErr) {
    // Sale insert failed — roll back the inventory decrement so counts stay correct.
    await supabase
      .from('exh_items')
      .update({ size_inventory: inv, updated_at: itemRows.updated_at })
      .eq('id', itemId);
    return res.status(500).json({ error: 'Could not insert sale: ' + saleErr.message });
  }

  return res.status(200).json({ sale: saleRow, item: updatedItem });
}
