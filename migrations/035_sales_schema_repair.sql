-- Repair a database that ran an EARLIER build of migration 034.
--
-- 034 changed substantially during review, but /api/migrate records a file in
-- the migrations table and then skips it forever. A database that ran the first
-- build therefore reports "034 skipped (already run)" and will never receive
-- the later statements — the log says what the runner was asked to do, not what
-- the schema contains. Production is in exactly that state, confirmed by the
-- app's own schema diagnostic:
--
--   sales             missing public_heading, public_subheading, starts_on, ends_on
--   sale_collections  fine
--   sale_products     missing regular_price_snapshot
--
-- This file brings such a database up to the final V1 schema. On a database
-- that already has the final shape every statement is a no-op, so it is safe to
-- run anywhere and safe to run twice.
--
-- ── Recovering the dates ────────────────────────────────────────────────────
--
-- The old schema stored TIMESTAMPTZ. The old app wrote them like this:
--
--   start  `${date}T00:00:00Z`
--   end    `${date}T23:59:59Z`
--
-- Both encode the calendar date the operator typed, anchored to UTC. So the
-- date is recovered AT TIME ZONE 'UTC', which returns exactly what was typed
-- for both bounds.
--
-- Deliberately NOT America/New_York. Converting 2026-09-20T00:00:00Z to New
-- York gives 2026-09-19 20:00, whose date is the 19th — every start date would
-- silently move a day earlier. The business timezone governs how the app reads
-- a DATE today, and it is the wrong lens for decoding values a known encoder wrote
-- in UTC. Using it here would corrupt data rather than preserve it.
--
-- Postgres carries infinite timestamps through the cast unchanged, so "no
-- start" and "no end" keep their meaning without being special-cased.
--
-- ── Why the old columns are added before they are dropped ───────────────────
--
-- The runner cannot execute DO blocks — it splits this file on the semicolon
-- character, so a block with a body would be torn apart. That leaves no way to
-- write "copy this column only if it exists", because Postgres resolves column
-- names when it parses the statement, not when it runs it.
--
-- So the old columns are re-added first if they are absent. On a database that
-- already has the final schema they arrive empty and nullable, the copy matches
-- nothing because every value is NULL, and they are dropped again a moment
-- later. On a database with the old schema they are already there, holding the
-- data being rescued. One sequence, correct in both states.
--
-- NOTE: /api/migrate splits this file on the semicolon character. Do not use DO
-- blocks or function bodies here, and keep semicolons out of comments. Every
-- statement below must stand alone.

-- 1. The columns the final schema adds. Existing ones are left alone.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS public_heading TEXT NOT NULL DEFAULT '';

ALTER TABLE sales ADD COLUMN IF NOT EXISTS public_subheading TEXT NOT NULL DEFAULT '';

ALTER TABLE sales ADD COLUMN IF NOT EXISTS starts_on DATE NOT NULL DEFAULT '-infinity';

ALTER TABLE sales ADD COLUMN IF NOT EXISTS ends_on DATE NOT NULL DEFAULT 'infinity';

ALTER TABLE sale_products ADD COLUMN IF NOT EXISTS regular_price_snapshot INTEGER NOT NULL DEFAULT 0;

-- 2. Make the old columns nameable in both states, so the copy below parses.
--    Nullable and without a default on purpose: on an already-final database
--    they must arrive empty so the copy cannot touch anything.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- 3. Rescue the scheduling data, infinities included.
UPDATE sales SET starts_on = (starts_at AT TIME ZONE 'UTC')::date WHERE starts_at IS NOT NULL;

UPDATE sales SET ends_on = (ends_at AT TIME ZONE 'UTC')::date WHERE ends_at IS NOT NULL;

-- 4. Only now are the old columns expendable.
ALTER TABLE sales DROP COLUMN IF EXISTS starts_at;

ALTER TABLE sales DROP COLUMN IF EXISTS ends_at;

-- 5. A column added by hand, or by a partly-applied earlier attempt, may exist
--    without the constraint the final schema requires. Nulls are filled with
--    the sentinel that means the same thing before NOT NULL is asserted, so
--    these statements cannot fail on existing data.
UPDATE sales SET public_heading = '' WHERE public_heading IS NULL;

UPDATE sales SET public_subheading = '' WHERE public_subheading IS NULL;

UPDATE sales SET starts_on = '-infinity' WHERE starts_on IS NULL;

UPDATE sales SET ends_on = 'infinity' WHERE ends_on IS NULL;

UPDATE sale_products SET regular_price_snapshot = 0 WHERE regular_price_snapshot IS NULL;

ALTER TABLE sales ALTER COLUMN public_heading SET DEFAULT '';

ALTER TABLE sales ALTER COLUMN public_subheading SET DEFAULT '';

ALTER TABLE sales ALTER COLUMN starts_on SET DEFAULT '-infinity';

ALTER TABLE sales ALTER COLUMN ends_on SET DEFAULT 'infinity';

ALTER TABLE sale_products ALTER COLUMN regular_price_snapshot SET DEFAULT 0;

ALTER TABLE sales ALTER COLUMN public_heading SET NOT NULL;

ALTER TABLE sales ALTER COLUMN public_subheading SET NOT NULL;

ALTER TABLE sales ALTER COLUMN starts_on SET NOT NULL;

ALTER TABLE sales ALTER COLUMN ends_on SET NOT NULL;

ALTER TABLE sale_products ALTER COLUMN regular_price_snapshot SET NOT NULL;

-- 6. The window index. The old build gave it the SAME NAME over the timestamp
--    columns, so CREATE INDEX IF NOT EXISTS would find the name taken and leave
--    an index on columns that no longer exist to be useful. It is dropped by
--    name first, which is the only way to be sure what gets rebuilt.
DROP INDEX IF EXISTS sales_enabled_window_idx;

CREATE INDEX IF NOT EXISTS sales_enabled_window_idx ON sales(enabled, starts_on, ends_on);

-- 7. The remaining indexes are unchanged between the two builds, but a database
--    that never got them should end up with them all the same.
CREATE UNIQUE INDEX IF NOT EXISTS sale_collections_unique ON sale_collections(sale_id, collection_id);

CREATE INDEX IF NOT EXISTS sale_collections_collection_idx ON sale_collections(collection_id);

CREATE UNIQUE INDEX IF NOT EXISTS sale_products_unique ON sale_products(sale_id, product_id);

CREATE INDEX IF NOT EXISTS sale_products_product_idx ON sale_products(product_id);
