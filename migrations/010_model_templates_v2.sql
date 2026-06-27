-- Extend model_templates for Classic Front Stand group, status review flow, and rotation.
ALTER TABLE model_templates ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'needs_review';
ALTER TABLE model_templates ADD COLUMN IF NOT EXISTS group_name TEXT NOT NULL DEFAULT 'other';
ALTER TABLE model_templates ADD COLUMN IF NOT EXISTS subtype TEXT;
ALTER TABLE model_templates ADD COLUMN IF NOT EXISTS prompt TEXT;
-- Approve existing rows — they were already in active use before this migration.
UPDATE model_templates SET status = 'approved' WHERE status = 'needs_review';
