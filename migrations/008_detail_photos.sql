-- Per-slot detail photos for catalog insets and product detail display.
-- products.photo remains the main structural garment photo.
-- products.model_photo remains the generated model image.
-- products.detail_photos stores optional supporting detail photos by slot.
ALTER TABLE products ADD COLUMN IF NOT EXISTS detail_photos JSONB;
