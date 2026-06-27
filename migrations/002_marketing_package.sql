-- Migration 002: Marketing Package fields
-- Adds new content columns to products table for storing generated marketing assets

ALTER TABLE products ADD COLUMN IF NOT EXISTS whatsapp_listing TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS story_text TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_card TEXT;
