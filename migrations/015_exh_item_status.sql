-- Add status column to exh_items for archive/delete support.
-- Values: active (default), archived, deleted
ALTER TABLE exh_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
