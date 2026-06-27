-- Garment structure fields detected during analysis.
-- Used by buildFashnPrompt() to generate garment-specific FASHN guardrail prompts.
ALTER TABLE products ADD COLUMN IF NOT EXISTS neckline     TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_placket  BOOLEAN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_dupatta  BOOLEAN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS motifs       JSONB;
