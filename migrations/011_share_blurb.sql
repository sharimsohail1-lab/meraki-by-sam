-- Migration 011: Share blurb field
-- Short 1-2 sentence bio for visual share cards (individual product sharing).
-- Distinct from catalog_blurb (which can be longer) and description_en (full analysis).

ALTER TABLE products ADD COLUMN IF NOT EXISTS share_blurb TEXT;
