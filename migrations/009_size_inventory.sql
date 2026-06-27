-- Per-product size-level inventory counts.
-- Stored as JSONB: { "XS": 0, "S": 1, "M": 2, "L": 1, "XL": 0, "XXL": 0 }
-- NULL means no size tracking entered yet; fall back to products.status for availability.
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_inventory JSONB;
