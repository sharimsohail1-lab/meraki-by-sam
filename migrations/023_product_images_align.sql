-- Bring product_images up to the finalised Phase 1 shape.
--
-- Why this exists: an earlier version of 019_product_images.sql was a live,
-- discoverable .sql file between 2026-08-02 and 2026-08-04. If /api/migrate ran in
-- that window, that older definition was applied and recorded in the migrations
-- table under the name "019_product_images.sql". A later run then reports it as
-- "skipped (already run)" and never applies the finalised definition, because the
-- tracker matches on filename only.
--
-- Editing 019 in place would not help: it is already recorded as run. This is a
-- forward-only correction instead.
--
-- Every statement is idempotent, so this file is a no-op if the table already
-- matches the finalised shape, and a repair if it carries the older one. It is
-- safe to run in either case, and it preserves any existing rows.
--
-- NOTE: /api/migrate splits this file on the semicolon character. Do not use DO
-- blocks or function bodies here — their internal semicolons would be shredded.
-- Every statement below must stand alone.

-- Columns the older definition lacked.
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE product_images ADD COLUMN IF NOT EXISTS alt_text TEXT;

ALTER TABLE product_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- The older definition named this index product_images_role_idx. Same columns,
-- different name. Drop the old name and ensure the current one exists.
DROP INDEX IF EXISTS product_images_role_idx;

CREATE INDEX IF NOT EXISTS product_images_gallery_idx
  ON product_images(product_id, image_role, sort_order);

CREATE INDEX IF NOT EXISTS product_images_product_id_idx
  ON product_images(product_id);

-- Website gallery reads: published images for one product, in order.
CREATE INDEX IF NOT EXISTS product_images_website_idx
  ON product_images(product_id, sort_order) WHERE show_on_website;

-- Exactly one hero per product. Scoped to the product rather than the role,
-- because the storefront gallery leads with a single image.
--
-- If this statement fails with a uniqueness violation, some product already has
-- more than one row with is_primary = true. Resolve those rows first, then re-run.
-- The table is expected to be empty, so this is unlikely.
CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_primary_idx
  ON product_images(product_id) WHERE is_primary;

-- Match the project's posture. Every other table explicitly disables RLS, and all
-- access is via the service key server-side.
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;
