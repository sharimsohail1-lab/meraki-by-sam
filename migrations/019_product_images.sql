-- Multi-image support for products.
--
-- Image BYTES live in object storage (Supabase Storage bucket "product-images").
-- This table stores references and metadata only — never base64, never a data URL.
--
-- storage_key is authoritative. public_url is a denormalised convenience so the
-- website and app can render without knowing anything about the provider. Changing
-- provider later means re-deriving public_url, not migrating data.
--
-- Object keys are content-addressed and never overwritten:
--   products/{product_id}/{uuid}.webp
-- Replacing an image uploads a new object and repoints the row, so a stale CDN
-- copy is impossible by construction.
--
-- Legacy products.photo / products.model_photo / products.detail_photos remain the
-- source for products that have no rows here. Nothing is migrated by this file.
--
-- NOTE: /api/migrate splits this file on the semicolon character, so a semicolon
-- must never appear inside a comment here.

CREATE TABLE IF NOT EXISTS product_images (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Provider-agnostic reference. 'supabase' today, 'r2' or similar later.
  storage_provider TEXT        NOT NULL DEFAULT 'supabase',
  storage_key      TEXT        NOT NULL,
  public_url       TEXT,

  -- Role vocabulary mirrors PHOTO_SLOTS in index.html plus 'model' and 'original':
  -- front, back, bottom, dupatta, neckline, sleeves, hemline, blouse, skirt-front,
  -- skirt-detail, border, embroidery, model, original, gallery, detail, other.
  -- Deliberately not an enum — adding a garment type must not require a migration.
  image_role       TEXT        NOT NULL DEFAULT 'gallery',
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  is_primary       BOOLEAN     NOT NULL DEFAULT false,

  -- Storefront controls.
  show_on_website  BOOLEAN     NOT NULL DEFAULT true,
  alt_text         TEXT,

  -- Recorded once at upload. Lets the storefront reserve layout space without
  -- measuring, and makes portrait/landscape decisions cheap.
  width            INTEGER,
  height           INTEGER,
  bytes            INTEGER,
  mime_type        TEXT        NOT NULL DEFAULT 'image/webp',

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_images_product_id_idx
  ON product_images(product_id);

CREATE INDEX IF NOT EXISTS product_images_gallery_idx
  ON product_images(product_id, image_role, sort_order);

-- Website gallery reads: published images for one product, in order.
CREATE INDEX IF NOT EXISTS product_images_website_idx
  ON product_images(product_id, sort_order) WHERE show_on_website;

-- Exactly one hero per product. Scoped to the product rather than to the role,
-- because the storefront gallery leads with a single image and "primary front"
-- plus "primary model" would leave that ambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_primary_idx
  ON product_images(product_id) WHERE is_primary;

-- Match the project's existing posture. Every other table in this schema
-- explicitly disables RLS, and access is via the service key server-side only.
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;
