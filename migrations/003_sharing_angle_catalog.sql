-- Migration 003: Sharing angle and catalog blurb fields
-- Adds marketing positioning fields to products table

ALTER TABLE products ADD COLUMN IF NOT EXISTS sharing_angle TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_blurb TEXT;
