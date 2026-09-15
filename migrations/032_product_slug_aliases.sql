-- A published address is a permanent promise.
--
-- It is printed in catalogue PDFs that cannot be recalled, pasted into WhatsApp,
-- posted to Instagram and bookmarked. Until now the app protected that promise
-- by never changing a slug at all, which kept every old link alive but left a
-- renamed piece answering to the name it used to have. The storefront can now
-- resolve an address a piece used to own (website e99681d), so the app can
-- finally change a canonical slug — provided it never lets the old one go.
--
-- THE INVARIANT, and everything here exists to enforce it:
--
--   every route string belongs to exactly one product_id, forever.
--
-- Not to a name, not to a position in a list, not to "the second Roselle".
-- "roselle-2" is the permanent route identity of whichever piece first took it,
-- and it stays that piece's even after it is renamed to something with no
-- "roselle" in it at all. Another piece must never be able to claim it.
--
-- ── Why the ledger holds the CURRENT slug too ────────────────────────────────
--
-- The obvious shape is a table of retired slugs beside products.slug. It does
-- not work: a unique index on products.slug and a unique index on the retired
-- table cannot, between them, stop
--
--     products.slug = 'roselle'          (piece A)
--     retired.slug  = 'roselle'          (piece B)
--
-- because no single index spans both tables. Enforcing that from the app means
-- check-then-write, and check-then-write across two tables is a race, not a
-- guarantee. Postgres could exclude it with a trigger, but /api/migrate splits
-- every file on the semicolon character, so a function body cannot be written
-- here at all.
--
-- So this table holds EVERY route a piece has ever owned, the live one included.
-- One table, one unique index, one namespace — and claiming a route becomes a
-- single INSERT that the database either accepts or rejects atomically. There is
-- no window and nothing to reconcile.
--
--   product_slug_aliases   every route ever owned, by product_id   AUTHORITATIVE
--   products.slug          which of them is canonical right now
--   products.slug_aliases  the rest of them, mirrored for the website  DERIVED
--
-- The name says "aliases" because that is what all but one row are, and because
-- the app and the website already speak of aliases. Read it as a route ledger.
--
-- NOTE: /api/migrate splits this file on the semicolon character. Do not use DO
-- blocks or function bodies here, and keep semicolons out of comments. Every
-- statement below must stand alone.

CREATE TABLE IF NOT EXISTS product_slug_aliases (
  slug       TEXT PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- slug is the primary key, so the namespace is unique by construction. This
-- index is for the other direction: every route one piece owns, which is what
-- the mirror is rebuilt from.
CREATE INDEX IF NOT EXISTS product_slug_aliases_product_idx ON product_slug_aliases(product_id);

-- Register what every existing piece already owns. This invents no history: a
-- piece that has never been renamed ends up with exactly one row, its current
-- address, and an empty mirror. What it does is close the door — from now on no
-- other piece can claim a route that is already in use, which was never
-- enforceable before.
--
-- ON CONFLICT DO NOTHING so a re-run is a no-op, and so a row already claimed
-- by the app between deploy and migration is left alone rather than stolen.
INSERT INTO product_slug_aliases (slug, product_id)
SELECT slug, id FROM products WHERE slug IS NOT NULL AND btrim(slug) <> ''
ON CONFLICT (slug) DO NOTHING;

-- The mirror the storefront reads.
--
-- api/products.js on the website selects slug_aliases from the products row
-- itself, through its optional-column machinery — it does not join. So the
-- aliases have to appear on the row, and this column is how. It is DERIVED:
-- rebuilt from the ledger above on every change, never consulted to decide who
-- owns what, and safe to drop the day the storefront reads the ledger directly.
--
-- JSONB rather than text[] because /api/db strips nulls from writes, so a
-- whole-value write is the only way to clear something, and because the
-- website's sanitiser already accepts a JSON array. Defaults to an empty list,
-- which is exactly what every existing piece should have.
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug_aliases JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Whether this piece's address was chosen by hand.
--
-- A rename may re-derive an address the app made up from the old name. It must
-- never overwrite one Saima typed herself — that is a decision, not a
-- derivative. Comparing the slug against the name cannot tell the two apart
-- once a piece has been renamed twice, so the intent is recorded when it is
-- expressed rather than guessed at afterwards.
--
-- Existing rows default to false, which is correct: every slug in the database
-- today was allocated from a name by the app or its backfill. A hand-edited one
-- from before this column existed is additionally protected in the app, which
-- re-derives only when the current address still matches what the old name
-- would have produced.
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug_is_custom BOOLEAN NOT NULL DEFAULT false;
