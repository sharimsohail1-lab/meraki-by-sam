-- Exhibition Inventory Tracker (migration 014)
-- Separate from exhibition_items (which links existing catalog products to exhibitions)
-- exh_items: standalone quick-add items (folded/package photos, not catalog products)
-- exh_sales: per-item sales log with void support

CREATE TABLE IF NOT EXISTS exh_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exhibition_id UUID REFERENCES exhibitions(id) ON DELETE CASCADE,
  photo TEXT,
  name TEXT NOT NULL,
  price_usd NUMERIC(10,2),
  cost_pkr NUMERIC(12,2),
  size_inventory JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exh_sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exhibition_id UUID REFERENCES exhibitions(id) ON DELETE CASCADE,
  item_id UUID REFERENCES exh_items(id) ON DELETE CASCADE,
  size TEXT,
  quantity INTEGER DEFAULT 1,
  sold_price_usd NUMERIC(10,2),
  payment_method TEXT,
  notes TEXT,
  voided BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE exh_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE exh_sales DISABLE ROW LEVEL SECURITY;
