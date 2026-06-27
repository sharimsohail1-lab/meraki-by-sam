-- Model Template Library.
-- Stores generated or uploaded full-body model photos reused as FASHN virtual try-on inputs.
-- Static template definitions (prompts, pose notes) live in index.html as MODEL_TEMPLATE_DEFS.

CREATE TABLE IF NOT EXISTS model_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  def_id          TEXT NOT NULL UNIQUE,   -- matches MODEL_TEMPLATE_DEFS[n].defId
  name            TEXT NOT NULL,
  category        TEXT,
  pose_notes      TEXT,
  image           TEXT,                   -- base64 dataUrl
  source_provider TEXT NOT NULL DEFAULT 'ideogram',  -- 'ideogram' | 'upload'
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS model_templates_def_id_idx ON model_templates(def_id);
