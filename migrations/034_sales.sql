-- Sale campaigns.
--
-- A sale is a rule, not a price. products.price stays the one canonical regular
-- price — nothing here copies it, and nothing here is a second "list price".
-- What a campaign stores is which pieces it covers and, where the operator has
-- said so, what they should cost instead.
--
-- ── Why nothing in here is nullable ─────────────────────────────────────────
--
-- /api/db runs stripNulls() on every insert AND every update, so a nullable
-- column can be set but never cleared. A sale has genuinely clearable fields:
-- "no end date" is a thing an operator chooses, not an absence. Sending
-- {ends_at: null} would be silently dropped, the old end date would stand, and
-- the sale would expire on a day nobody chose. That is the worst kind of bug —
-- the write appears to succeed.
--
-- So every column is NOT NULL with a meaningful sentinel, and "no end" is a
-- real value Postgres understands:
--
--   starts_at '-infinity'   live from the moment it is enabled
--   ends_at    'infinity'   live until it is disabled
--   default_discount_percent 0   the campaign sets no default
--
-- Nothing in this schema can be corrupted by the proxy, and no JSONB is needed
-- to work around it.
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
  name                     TEXT NOT NULL,
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
  starts_at                TIMESTAMPTZ NOT NULL DEFAULT '-infinity',
  ends_at                  TIMESTAMPTZ NOT NULL DEFAULT 'infinity',
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

-- One row per pair, enforced by the database. The surrogate id above is not
-- redundant: /api/db keys every update and delete on `id` and ignores filters,
-- so a composite primary key alone would leave these rows unwritable through
-- the proxy. product_collections solves it the same way for the same reason.
CREATE UNIQUE INDEX IF NOT EXISTS sale_collections_unique
  ON sale_collections(sale_id, collection_id);

CREATE INDEX IF NOT EXISTS sale_collections_collection_idx ON sale_collections(collection_id);

-- One row serves two jobs, deliberately.
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
CREATE TABLE IF NOT EXISTS sale_products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id          UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  pricing_mode     TEXT NOT NULL DEFAULT 'default',
  discount_percent INTEGER NOT NULL DEFAULT 0,
  sale_price       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- As above: unique on the pair, surrogate id so the proxy can write it.
CREATE UNIQUE INDEX IF NOT EXISTS sale_products_unique
  ON sale_products(sale_id, product_id);

-- Resolution asks "which sales cover this piece", so the product side is the
-- one that needs the index.
CREATE INDEX IF NOT EXISTS sale_products_product_idx ON sale_products(product_id);

-- Finding the campaigns that could be live right now, without scanning history.
CREATE INDEX IF NOT EXISTS sales_enabled_window_idx ON sales(enabled, starts_at, ends_at);
