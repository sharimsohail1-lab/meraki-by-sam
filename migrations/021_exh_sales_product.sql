-- Allow an exhibition sale to reference a catalogue product instead of a
-- standalone exh_items row.
--
-- Why: exhibition_items links an existing product into an exhibition, but
-- exh_sales.item_id has a foreign key to exh_items, so a sale of an imported
-- product could not be logged at all. Previously the exhibition UI just set
-- products.status = 'sold' for the whole product, with no size and no sale record.
--
-- A sale row now carries exactly one of:
--   item_id    - standalone exhibition item (unchanged, existing rows keep this)
--   product_id - catalogue product sold at the exhibition (new)
--
-- Non-destructive: adds one nullable column. No existing row is modified, and
-- exh_sales.size keeps whatever historical value it already holds, including
-- legacy letter sizes.
--
-- NOTE: /api/migrate splits this file on the semicolon character, so a semicolon
-- must never appear inside a comment here.

ALTER TABLE exh_sales
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS exh_sales_product_id_idx ON exh_sales(product_id);
