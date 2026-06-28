-- Archive support for products.
-- is_archived hides a product from active Stock, catalog, and pickers without deleting it.
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
