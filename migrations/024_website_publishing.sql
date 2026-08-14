-- Website publishing state for products.
--
-- The app becomes the control plane for storefront publication. These three
-- columns hold that state and nothing else: the website will read the canonical
-- product fields (name, price, description_en, garment details, size_inventory,
-- product_images) directly. No product data is duplicated here, and no snapshot
-- of a published product is stored.
--
-- NOTE: /api/migrate splits this file on the semicolon character. Do not use DO
-- blocks or function bodies here, and keep semicolons out of comments — their
-- semicolons would be shredded. Every statement below must stand alone.

-- draft | published | hidden.
--
-- NOT NULL with a default rather than a nullable column where NULL means draft.
-- A nullable tri-state would put "NULL is really draft" into every read site in
-- the app and in the future storefront query. Existing rows are backfilled to
-- draft by the default, which is the intended state for them: nothing is
-- published until Saima explicitly publishes it.
ALTER TABLE products ADD COLUMN IF NOT EXISTS website_status TEXT NOT NULL DEFAULT 'draft';

-- ready_now | made_to_order | both. Nullable until Saima chooses one — it is
-- never inferred from inventory, and publishing is blocked until it is set.
ALTER TABLE products ADD COLUMN IF NOT EXISTS website_availability TEXT;

-- First publication time, preserved across hide and republish. Set only when it
-- is currently NULL, so it always means "first published", never "last published".
ALTER TABLE products ADD COLUMN IF NOT EXISTS website_published_at TIMESTAMPTZ;

-- Value constraints. Dropped first so re-running this file cannot fail on an
-- already-present constraint, and so a future value list is a one-line edit.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_website_status_chk;

ALTER TABLE products ADD CONSTRAINT products_website_status_chk
  CHECK (website_status IN ('draft', 'published', 'hidden'));

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_website_availability_chk;

ALTER TABLE products ADD CONSTRAINT products_website_availability_chk
  CHECK (website_availability IS NULL OR website_availability IN ('ready_now', 'made_to_order', 'both'));

-- The storefront's only query shape: published products, newest first.
CREATE INDEX IF NOT EXISTS products_website_published_idx
  ON products(created_at DESC) WHERE website_status = 'published';
