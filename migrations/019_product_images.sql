-- Future product_images table for multi-image gallery support.
-- Stores references to images in object storage (Supabase Storage or Cloudflare R2).
-- Does NOT store image bytes — only keys, URLs, and metadata.
--
-- This migration is PREPARED BUT NOT EXECUTED.
-- Apply it manually when Supabase Storage (or R2) is configured and the gallery
-- feature is ready to be built. Existing products continue to use products.photo,
-- products.model_photo, and products.detail_photos until a migration script
-- back-fills their images into this table.
--
-- Storage path convention:
--   products/{product_id}/original/{uuid}.webp
--   products/{product_id}/model/{uuid}.webp
--   products/{product_id}/gallery/{uuid}.webp
--   products/{product_id}/thumb/{uuid}.webp
--   templates/{template_id}/{uuid}.webp
--   exhibitions/{item_id}/{uuid}.webp

CREATE TABLE IF NOT EXISTS product_images (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Storage location — provider-agnostic so switching from Supabase to R2 only
  -- requires updating the public_url column and changing getImageUrl() in the frontend.
  storage_provider TEXT        NOT NULL DEFAULT 'supabase',  -- 'supabase' | 'r2'
  storage_key      TEXT        NOT NULL,                     -- object key within the bucket
  public_url       TEXT,                                     -- CDN / public URL for display

  -- Role distinguishes how the image is used in the UI.
  image_role       TEXT        NOT NULL DEFAULT 'gallery',   -- 'original' | 'model' | 'gallery' | 'thumb' | 'detail'

  -- Ordering within a role (e.g., 0 = primary gallery image).
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  is_primary       BOOLEAN     NOT NULL DEFAULT false,       -- true for the cover image within a role

  -- Image metadata — recorded at upload time, never re-derived.
  width            INTEGER,
  height           INTEGER,
  bytes            INTEGER,
  mime_type        TEXT        NOT NULL DEFAULT 'image/webp',

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON product_images(product_id);
CREATE INDEX IF NOT EXISTS product_images_role_idx       ON product_images(product_id, image_role, sort_order);
