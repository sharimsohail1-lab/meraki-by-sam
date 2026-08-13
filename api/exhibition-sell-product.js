import { createClient } from '@supabase/supabase-js';

// Sells one size of a catalogue product at an exhibition.
//
// The exhibition_items join row only records that a product is present at an
// exhibition — products.size_inventory stays the single source of truth for
// stock, so there is no second copy to keep in sync.
//
// Mirrors exhibition-log-sale.js: inventory is re-read from the database
// immediately before the decrement, so a stale client cannot oversell, and the
// decrement is rolled back if the sale row fails to insert.

// Sums every size key, not just a fixed list, so a product still holding legacy
// letter sizes is counted correctly during the numeric transition.
function totalUnits(inv) {
  return Object.values(inv || {}).reduce((sum, v) => sum + Math.max(0, parseInt(v, 10) || 0), 0);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Supabase not configured' });

  const { exhibitionId, productId, size, quantity, soldPriceUsd, paymentMethod, notes } = req.body || {};

  if (!exhibitionId || !productId || !size || !quantity || soldPriceUsd == null) {
    return res.status(400).json({ error: 'Missing required fields: exhibitionId, productId, size, quantity, soldPriceUsd' });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'Quantity must be a positive integer' });
  }

  const supabase = createClient(url, key);

  // Fresh read — whatever the client believes is ignored.
  const { data: product, error: fetchErr } = await supabase
    .from('products')
    .select('id, sku, name, status, sold_at, size_inventory')
    .eq('id', productId)
    .single();

  if (fetchErr || !product) return res.status(404).json({ error: 'Product not found' });

  let inv = product.size_inventory;
  if (typeof inv === 'string') { try { inv = JSON.parse(inv); } catch { inv = null; } }
  if (!inv || typeof inv !== 'object' || Array.isArray(inv)) {
    return res.status(409).json({ error: 'This product has no size inventory to sell from.' });
  }

  if (!(size in inv)) {
    return res.status(409).json({ error: `Size ${size} is not tracked on this product. Refresh and try again.` });
  }

  const currentStock = Math.max(0, parseInt(inv[size], 10) || 0);
  if (currentStock < quantity) {
    return res.status(409).json({
      error: `Only ${currentStock} left in size ${size}. Refresh inventory and try again.`,
      currentStock,
    });
  }

  // Decrement the exact key that was sold — no size mapping of any kind.
  const newInv = { ...inv, [size]: currentStock - quantity };
  const remaining = totalUnits(newInv);

  // Same status rule as the rest of the app: reserved is preserved, otherwise
  // a product is sold only once every size is exhausted.
  let newStatus = product.status;
  let newSoldAt = product.sold_at;
  if (product.status !== 'reserved') {
    newStatus = remaining === 0 ? 'sold' : 'available';
    if (newStatus === 'sold' && product.status !== 'sold') newSoldAt = new Date().toISOString();
    if (newStatus === 'available' && product.status === 'sold') newSoldAt = null;
  }

  const { data: updatedProduct, error: updateErr } = await supabase
    .from('products')
    .update({ size_inventory: JSON.stringify(newInv), status: newStatus, sold_at: newSoldAt })
    .eq('id', productId)
    .select('id, sku, name, status, sold_at, size_inventory')
    .single();

  if (updateErr) {
    return res.status(500).json({ error: 'Could not update product inventory: ' + updateErr.message });
  }

  const { data: saleRow, error: saleErr } = await supabase
    .from('exh_sales')
    .insert({
      exhibition_id: exhibitionId,
      product_id: productId,
      item_id: null,
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
    // Roll the stock back so inventory and sale history cannot diverge.
    await supabase
      .from('products')
      .update({ size_inventory: product.size_inventory, status: product.status, sold_at: product.sold_at })
      .eq('id', productId);
    const hint = /product_id/.test(saleErr.message || '')
      ? ' — run /api/migrate to add exh_sales.product_id'
      : '';
    return res.status(500).json({ error: 'Could not insert sale: ' + saleErr.message + hint });
  }

  return res.status(200).json({ sale: saleRow, product: updatedProduct, remaining });
}
