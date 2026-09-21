-- Sale campaigns.
--
-- A sale is a rule, not a price. products.price stays the one canonical regular
-- price — nothing here copies it as a second "list price". What a campaign
-- stores is which pieces it covers and, where the operator has said so, what
-- they should cost instead.
--
-- ── Why nothing in here is nullable ─────────────────────────────────────────
--
-- /api/db runs stripNulls() on every insert AND every update, so a nullable
-- column can be set but never cleared. A sale has genuinely clearable fields:
-- "no end date" is a thing an operator chooses, not an absence. Sending
-- {ends_on: null} would be silently dropped, the old end date would stand, and
-- the sale would expire on a day nobody chose. That is the worst kind of bug —
-- the write appears to succeed.
--
-- So every column is NOT NULL with a meaningful sentinel, and "no end" is a
-- real value Postgres understands:
--
--   starts_on '-infinity'   live from the moment it is enabled
--   ends_on    'infinity'   live until it is disabled
--   default_discount_percent 0   the campaign sets no default
--   public_heading ''            no public copy written yet
--
-- Nothing in this schema can be corrupted by the proxy, and no JSONB is needed
-- to work around it.
--
-- ── DATE, not TIMESTAMPTZ ───────────────────────────────────────────────────
--
-- Nobody picks a time of day for a sale. Storing timestamps would mean every
-- boundary silently acquired a time and a zone: a sale set to end 30 September
-- would stop at 8pm Eastern on the 29th if the app ever compared a UTC instant
-- against a locally-chosen date. DATE removes the question. Postgres supports
-- infinite DATE values, so the no-null strategy survives the change intact.
--
-- The rules the app implements on top of these two columns:
--
--   no start          eligible as soon as it is enabled
--   start = today     active today, the moment it is enabled
--   start in future   scheduled
--   end = today       still active for the whole of today
--   end passed        ended from the following calendar day
--   disabled          off immediately, whatever the dates say
--
-- ── Money and percentages ───────────────────────────────────────────────────
--
-- products.price is already INTEGER whole dollars, so sale_price is too. No
-- cents, no decimals, anywhere. discount_percent is a whole integer. Both are
-- stored even though either can be derived from the other, because the rounding
-- is deliberate and lossy — floor, always down, never nearest — so the pair is
-- not reversible and the stored values are what must be displayed, invoiced and
-- fed to ads.
--
-- NOTE: /api/migrate splits this file on the semicolon character. Do not use DO
-- blocks or function bodies here, and keep semicolons out of comments. Every
-- statement below must stand alone.

CREATE TABLE IF NOT EXISTS sales (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Operations only. Never shown to a customer, may repeat across campaigns,
  -- and is not identity — the UUID is. Two "Royal Muse Sale" rows are a normal
  -- thing to have, told apart by their dates.
  name                     TEXT NOT NULL,
  -- The customer-facing copy this sale owns, and the only public copy it owns.
  -- Hero artwork, crops, CTA and carousel behaviour belong to homepage
  -- campaigns and are deliberately absent here.
  public_heading           TEXT NOT NULL DEFAULT '',
  public_subheading        TEXT NOT NULL DEFAULT '',
  enabled                  BOOLEAN NOT NULL DEFAULT false,
  -- sitewide | collections | products
  scope_type               TEXT NOT NULL DEFAULT 'products',
  -- 0 means the campaign sets no default and each piece must say for itself.
  default_discount_percent INTEGER NOT NULL DEFAULT 0,
  -- Only consulted when two campaigns of the SAME scope specificity cover one
  -- piece. Left at 0 the resolver falls through to "lowest price wins", which
  -- is the behaviour with no priorities at all — so this column costs nothing
  -- until two sales actually collide, and the UI keeps it out of the way.
  priority                 INTEGER NOT NULL DEFAULT 0,
  starts_on                DATE NOT NULL DEFAULT '-infinity',
  ends_on                  DATE NOT NULL DEFAULT 'infinity',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Which collections a collections-scoped campaign covers. One row per
-- collection, so "multiple collections" is just more rows.
CREATE TABLE IF NOT EXISTS sale_collections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row serves three jobs, deliberately.
--
-- In a products-scoped campaign the row IS the membership: a piece is in the
-- sale because it has a row. In a sitewide or collections-scoped campaign the
-- piece is already included by scope, and the row is an OVERRIDE saying this
-- one is priced differently, or not on sale at all.
--
-- Two tables would need a rule for what it means to appear in both. One table
-- cannot disagree with itself.
--
--   pricing_mode  default     follow the campaign's default discount
--                 percent     discount_percent is authoritative
--                 sale_price  sale_price is authoritative
--                 exclude     this piece is not on sale
--
-- Both prices are 0 until the mode needs them, which is why they are NOT NULL
-- with a zero default rather than nullable.
--
-- The third job is history — see the snapshot column below.
CREATE TABLE IF NOT EXISTS sale_products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id          UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  pricing_mode     TEXT NOT NULL DEFAULT 'default',
  discount_percent INTEGER NOT NULL DEFAULT 0,
  sale_price       INTEGER NOT NULL DEFAULT 0,
  -- What products.price was when this piece joined this campaign.
  --
  -- This is not a price-history system and is not consulted for anything live:
  -- while a sale is running, the regular price is products.price, full stop.
  -- It exists so a finished promotion still reads as the offer that was
  -- actually made. A piece sold at $400 off a $500 regular must keep saying
  -- "$500 → $400, 20% off" after the regular price moves to $550 — otherwise
  -- last season's record quietly rewrites itself into a lie.
  --
  -- 0 means "never captured", and the app falls back to the live price rather
  -- than inventing a regular of nothing.
  regular_price_snapshot INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Re-running over an earlier build of this same migration ─────────────────
--
-- 034 was never released, but a preview deploy may have run an earlier version
-- of this file against a database. These statements bring such a database up to
-- the shape above and are no-ops on a fresh one. They are written as separate
-- ALTERs rather than a DO block because the runner splits on semicolons.
--
-- ORDER MATTERS. These sit above every CREATE INDEX on purpose: a database that
-- ran the earlier build already has a `sales` table, so CREATE TABLE IF NOT
-- EXISTS does nothing for it and the new columns arrive only here. An index on
-- (enabled, starts_on, ends_on) placed before this block would name a column
-- that does not exist yet and abort the whole migration.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS public_heading TEXT NOT NULL DEFAULT '';

ALTER TABLE sales ADD COLUMN IF NOT EXISTS public_subheading TEXT NOT NULL DEFAULT '';

ALTER TABLE sales ADD COLUMN IF NOT EXISTS starts_on DATE NOT NULL DEFAULT '-infinity';

ALTER TABLE sales ADD COLUMN IF NOT EXISTS ends_on DATE NOT NULL DEFAULT 'infinity';

ALTER TABLE sale_products ADD COLUMN IF NOT EXISTS regular_price_snapshot INTEGER NOT NULL DEFAULT 0;

-- The timestamp columns an earlier build of this file created. Dropped rather
-- than migrated: nothing shipped, so there is no data worth carrying over, and
-- leaving them would give the schema two answers to "when does this run".
ALTER TABLE sales DROP COLUMN IF EXISTS starts_at;

ALTER TABLE sales DROP COLUMN IF EXISTS ends_at;

-- One row per pair, enforced by the database. The surrogate id above is not
-- redundant: /api/db keys every update and delete on `id` and ignores filters,
-- so a composite primary key alone would leave these rows unwritable through
-- the proxy. product_collections solves it the same way for the same reason.
CREATE UNIQUE INDEX IF NOT EXISTS sale_collections_unique
  ON sale_collections(sale_id, collection_id);

CREATE INDEX IF NOT EXISTS sale_collections_collection_idx ON sale_collections(collection_id);

-- As above: unique on the pair, surrogate id so the proxy can write it.
CREATE UNIQUE INDEX IF NOT EXISTS sale_products_unique
  ON sale_products(sale_id, product_id);

-- Resolution asks "which sales cover this piece", so the product side is the
-- one that needs the index.
CREATE INDEX IF NOT EXISTS sale_products_product_idx ON sale_products(product_id);

-- Finding the campaigns that could be live today, without scanning history.
CREATE INDEX IF NOT EXISTS sales_enabled_window_idx ON sales(enabled, starts_on, ends_on);
