-- Homepage merchandising: what the storefront's front page shows.
--
-- Two different shapes, because two different things are being stored.
--
-- 1. The homepage configuration itself is a singleton with no relationships of
--    its own: one campaign, one featured edit, one new-arrivals block. It lives
--    as JSONB on the existing website_settings row rather than as twenty new
--    columns. Two reasons beyond tidiness:
--
--      /api/db strips nulls from every insert and update, so a nullable column
--      can be set but never cleared through it. A whole-object write has no such
--      hole — removing a campaign heading is just an object without that key.
--
--      The shape is nested and will grow a Customer Looks block later. Columns
--      would flatten that into prefixed names and a migration per field.
--
--    Enums, ranges and reference validity are enforced in the app on write and
--    re-checked on read, so a hand-edited row cannot break the storefront.
--
-- 2. Curated edits are NOT a singleton and NOT a collection. They are named,
--    slugged, routable entities with an ordered product list, so they get real
--    tables. A curated edit crosses collections on purpose — Eid Picks may draw
--    from Roselle and Royal Muse at once — which is exactly why it cannot be
--    modelled as a collection.
--
-- featured_product_id on website_settings is deliberately untouched. It is the
-- old single-product hero, superseded here, and stays inert until a later
-- cleanup phase removes it.
--
-- NOTE: /api/migrate splits this file on the semicolon character. Do not use DO
-- blocks or function bodies here, and keep semicolons out of comments. Every
-- statement below must stand alone.

-- ── Homepage configuration ──────────────────────────────────────────────────
-- Defaults to an empty object, which the app reads as "nothing configured yet".
-- That is the state the storefront must treat as "behave exactly as you do
-- today", so an app deployed ahead of the website changes nothing.
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS homepage_config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── Curated edits ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS curated_edits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,
  subtitle        TEXT,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Its own slug namespace. Collections route at #/collection/<slug> and curated
-- edits at #/edit/<slug>, so the two never need to be unique against each other
-- and an edit may legitimately share a name with a collection.
CREATE UNIQUE INDEX IF NOT EXISTS curated_edits_slug_key ON curated_edits(slug);

CREATE TABLE IF NOT EXISTS curated_edit_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curated_edit_id UUID NOT NULL REFERENCES curated_edits(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A product appears in an edit once. Order is what the operator chose, held in
-- sort_order rather than inferred from insertion time.
CREATE UNIQUE INDEX IF NOT EXISTS curated_edit_products_unique
  ON curated_edit_products(curated_edit_id, product_id);

CREATE INDEX IF NOT EXISTS curated_edit_products_order_idx
  ON curated_edit_products(curated_edit_id, sort_order);

-- Deleting a product removes it from every edit, because the row cannot
-- meaningfully survive its product. Unpublishing or archiving does NOT: those
-- are reversible states, the operator's choice is still their choice, and the
-- storefront skips what it cannot show at render time.

-- Match the project's posture. Every other table explicitly disables RLS, and
-- all access is via the service key server-side.
ALTER TABLE curated_edits DISABLE ROW LEVEL SECURITY;

ALTER TABLE curated_edit_products DISABLE ROW LEVEL SECURITY;
