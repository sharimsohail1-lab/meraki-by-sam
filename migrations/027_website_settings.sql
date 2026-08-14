-- Global website settings, plus a product-specific fulfilment note.
--
-- Scope is deliberately narrow. Only values Saima may realistically change live
-- here. Brand and editorial copy — the homepage headline, the introduction, Our
-- Story, section titles, button labels — stay in the website's code, because
-- making them editable buys maintenance burden and no benefit until they
-- actually start changing.
--
-- NOTE: /api/migrate splits this file on the semicolon character. Do not use DO
-- blocks or function bodies here, and keep semicolons out of comments. Every
-- statement below must stand alone.

-- ── Product-specific fulfilment note ────────────────────────────────────────
-- Customer-facing, optional, and entirely independent of website_availability.
-- Availability answers "can this be bought", the note answers "when will it
-- arrive". Nothing derives one from the other, and the global lead-time setting
-- never populates this.
ALTER TABLE products ADD COLUMN IF NOT EXISTS fulfillment_note TEXT;

-- ── Global website settings ─────────────────────────────────────────────────
-- A singleton: exactly one row, ever. Explicit columns rather than a content
-- JSON blob, because the field list is short, stable and individually typed —
-- a blob would cost validation and readability for no gain at this size.
--
-- id is a fixed constant rather than a generated UUID. Combined with the check
-- constraint it makes "the settings row" addressable without a lookup and makes
-- a second row impossible.
--
-- created_at exists because /api/db orders every select by it.
CREATE TABLE IF NOT EXISTS website_settings (
  id                       UUID PRIMARY KEY DEFAULT '00000000-0000-4000-8000-000000000001',
  featured_product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  whatsapp                 TEXT,
  contact_email            TEXT,
  instagram_url            TEXT,
  location_label           TEXT,
  made_to_order_lead_time  TEXT,
  size_service_note        TEXT,
  inquiry_response_note    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row, enforced by the database rather than by convention.
ALTER TABLE website_settings DROP CONSTRAINT IF EXISTS website_settings_singleton_chk;

ALTER TABLE website_settings ADD CONSTRAINT website_settings_singleton_chk
  CHECK (id = '00000000-0000-4000-8000-000000000001');

-- ON DELETE SET NULL above means deleting the featured product clears the
-- reference rather than orphaning it. Hidden, draft and archived products are
-- filtered at read time instead, since those states are reversible.

-- Match the project's posture. Every other table explicitly disables RLS, and
-- all access is via the service key server-side.
ALTER TABLE website_settings DISABLE ROW LEVEL SECURITY;
