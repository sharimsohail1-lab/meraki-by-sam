-- Stable customer-facing product identifier for the storefront.
--
-- The identity model going forward:
--   id    immutable Supabase UUID, internal and stable
--   slug  stable customer-facing route segment
--   name  canonical product name, owned by the app
--
-- Slugs are derived from the app's own product names. Nothing here references
-- the current static website catalogue, and no existing storefront route is
-- mapped or preserved.
--
-- This migration adds the column and its uniqueness guarantee only. Values are
-- allocated by the app, not here.
--
-- Why not backfill in SQL: collision resolution needs iteration. A window
-- function partitioned on the normalised base cannot see that a product named
-- "Noor 2" already occupies the slug that the second product named "Noor" would
-- be given, because the two sit in different partitions. Resolving that requires
-- retrying a candidate until it is free, which needs a loop, and /api/migrate
-- splits files on the semicolon character so a DO block cannot be used here.
-- Rather than ship a subtly wrong second implementation, allocation lives in one
-- place in the app and runs against this index.
--
-- NOTE: /api/migrate splits this file on the semicolon character. Do not use DO
-- blocks or function bodies here, and keep semicolons out of comments. Every
-- statement below must stand alone.

ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

-- One product per slug. Partial, so the rows still awaiting a slug do not all
-- collide on null. This index is what makes the app's allocator safe: a racing
-- duplicate is rejected by the database rather than silently accepted.
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique_idx ON products(slug) WHERE slug IS NOT NULL;
