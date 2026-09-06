-- Collections become real records, and a product's membership in one gains its
-- own website visibility.
--
-- Until now a collection was only a string on a product: products.collection_name
-- (the legacy primary) plus products.collection_names (a JSONB array), merged by
-- getProductCollections(). There was nowhere to record anything ABOUT a
-- collection, so "archived" was parked in the settings key/value table under
-- archived_collections. That has no room for publishing controls, and no room at
-- all for a per-membership flag.
--
-- Two things are needed and they are genuinely different:
--   collections.show_on_website          is this collection live at all
--   product_collections.show_on_website  should THIS product appear in THIS
--                                        collection publicly
--
-- The second exists because a piece can sit in several collections internally
-- while being merchandised publicly in only one of them.
--
-- products.collection_names stays exactly as it is and remains what the app
-- reads for internal membership — Stock, the catalog builder, collection screens
-- and intake all depend on it, and rewriting those is not this phase's job. The
-- join table is the canonical record of membership FOR THE WEBSITE, and both are
-- written by one helper in the app so they cannot drift.
--
-- NOTE: /api/migrate splits this file on the semicolon character. Do not use DO
-- blocks or function bodies here, and keep semicolons out of comments. Every
-- statement below must stand alone.

CREATE TABLE IF NOT EXISTS collections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One record per collection name. Names are the app's existing identifier for a
-- collection, so uniqueness here is what stops two records describing the same
-- collection.
CREATE UNIQUE INDEX IF NOT EXISTS collections_name_key ON collections(name);

CREATE TABLE IF NOT EXISTS product_collections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_id   UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A product is in a collection once or not at all. This is what prevents
-- duplicate membership rows.
CREATE UNIQUE INDEX IF NOT EXISTS product_collections_unique
  ON product_collections(product_id, collection_id);

CREATE INDEX IF NOT EXISTS product_collections_product_idx ON product_collections(product_id);

CREATE INDEX IF NOT EXISTS product_collections_collection_idx ON product_collections(collection_id);

-- ── Backfill ────────────────────────────────────────────────────────────────
-- Everything that exists today becomes visible. The website currently shows
-- every collection a published product belongs to, so defaulting to true is what
-- keeps the storefront looking identical the moment this runs. Hiding anything
-- is then a deliberate act in the app.
--
-- collection_name is read as ONE name, not split on commas, because that is
-- exactly how getProductCollections() reads it — the backfill has to agree with
-- what the app already displays, whatever an older comment may have said about
-- comma separation.

INSERT INTO collections (name)
SELECT DISTINCT btrim(n) AS name
FROM (
  SELECT collection_name AS n FROM products
   WHERE collection_name IS NOT NULL AND btrim(collection_name) <> ''
  UNION ALL
  SELECT jsonb_array_elements_text(collection_names) AS n FROM products
   WHERE collection_names IS NOT NULL AND jsonb_typeof(collection_names) = 'array'
) src
WHERE btrim(n) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_collections (product_id, collection_id, show_on_website)
SELECT p.id, c.id, true
FROM products p
JOIN LATERAL (
  SELECT btrim(p.collection_name) AS n
   WHERE p.collection_name IS NOT NULL AND btrim(p.collection_name) <> ''
  UNION
  SELECT btrim(x) AS n
    FROM jsonb_array_elements_text(
           CASE WHEN jsonb_typeof(p.collection_names) = 'array'
                THEN p.collection_names ELSE '[]'::jsonb END) AS x
   WHERE btrim(x) <> ''
) m ON true
JOIN collections c ON c.name = m.n
ON CONFLICT (product_id, collection_id) DO NOTHING;

-- Match the project's posture. Every other table explicitly disables RLS, and
-- all access is via the service key server-side.
ALTER TABLE collections DISABLE ROW LEVEL SECURITY;

ALTER TABLE product_collections DISABLE ROW LEVEL SECURITY;
