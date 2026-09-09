-- Garment descriptors become structured, multi-valued and individually
-- publishable.
--
-- Until now a descriptor was one text column holding one string, and the
-- storefront showed whatever was not blank. That cannot express "this piece is
-- Organza AND Raw Silk", and it cannot express "we record the care instruction
-- but do not print it", which are the two things this phase is for. It also has
-- no room for the two new descriptors, Recommended Occasion and Style.
--
-- One JSONB column rather than seven more text columns plus seven booleans:
--
--   { "fabric":   { "values": ["Organza","Raw Silk"], "show": true },
--     "pieces":   { "values": ["3 Piece"],            "show": true },
--     "color":    { "values": ["Ivory","Gold"],       "show": true },
--     "made":     { "values": ["Lahore, by hand"],    "show": true },
--     "care":     { "values": ["Dry clean only"],     "show": false },
--     "occasion": { "values": ["Eid"],                "show": true },
--     "style":    { "values": ["Kaftan"],             "show": true } }
--
-- Every descriptor has the same shape, so nothing in the app has to branch on
-- which one it is holding. Single-valued descriptors simply carry one entry.
-- /api/db also strips nulls from writes, so a per-column model could set a
-- descriptor but never clear it — a whole-object write has no such hole.
--
-- THIS COLUMN IS CANONICAL. products.fabric, pieces, color, made and care are
-- kept and are now DERIVED: the app rewrites them from this column on every
-- save, joined with ", " and blanked when the descriptor is hidden. That is what
-- lets the live website — which today shows any non-blank column — keep working
-- unchanged, and honour the new visibility switches immediately, before the
-- website itself knows any of this exists. They are compatibility only. Nothing
-- edits them directly any more, and they are retired once the storefront reads
-- the structured contract.
--
-- NOTE: /api/migrate splits this file on the semicolon character. Do not use DO
-- blocks or function bodies here, and keep semicolons out of comments. Every
-- statement below must stand alone.

ALTER TABLE products ADD COLUMN IF NOT EXISTS garment_details JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill from the five existing columns. Every descriptor that has a value
-- today becomes a single-entry, VISIBLE descriptor, which is exactly what the
-- storefront shows right now — so the migration changes nothing a customer sees.
-- Blank and whitespace-only columns become no descriptor at all rather than an
-- empty row.
--
-- Only rows that have not been touched yet are filled, so re-running this file
-- cannot overwrite work done in the app afterwards.
UPDATE products SET garment_details = (
  SELECT coalesce(
           jsonb_object_agg(t.k, jsonb_build_object('values', jsonb_build_array(btrim(t.v)), 'show', true)),
           '{}'::jsonb)
    FROM (VALUES
            ('fabric', products.fabric),
            ('pieces', products.pieces),
            ('color',  products.color),
            ('made',   products.made),
            ('care',   products.care)
         ) AS t(k, v)
   WHERE t.v IS NOT NULL AND btrim(t.v) <> ''
)
WHERE garment_details = '{}'::jsonb;
