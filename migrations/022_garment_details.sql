-- Intrinsic garment attributes, shared by the app, catalog, share cards and the
-- future storefront.
--
-- First-class columns rather than a JSONB blob: these are stable, small, and will
-- be queried and displayed individually. A blob would make them awkward to filter
-- on and invisible to the column allowlist in api/db.js.
--
-- All nullable and all optional. Product intake does not require any of them, and
-- existing products may legitimately leave them blank.
--
-- The UI label for "color" is "Colour" — the column keeps the ASCII spelling to
-- match every other identifier in the schema.
--
-- NOTE: /api/migrate splits this file on the semicolon character, so a semicolon
-- must never appear inside a comment here.

ALTER TABLE products ADD COLUMN IF NOT EXISTS fabric TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pieces TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS color  TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS made   TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS care   TEXT;
