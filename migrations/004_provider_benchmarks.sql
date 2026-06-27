-- Provider benchmark infrastructure.
-- benchmark_garments: reference garments Sam has selected for provider comparison.
-- benchmark_results:  one row per (garment × provider) generation, with scores.

CREATE TABLE IF NOT EXISTS benchmark_garments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT,
  notes       TEXT,
  photo       TEXT,     -- base64 data URL (original garment flat-lay)
  prompt      TEXT,     -- ideogram_prompt to use for generation
  product_id  UUID,     -- reference to the source product (informational)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS benchmark_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garment_id      UUID NOT NULL REFERENCES benchmark_garments(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,    -- e.g. 'ideogram', 'flux', 'imagen'
  generated_photo TEXT,             -- base64 data URL of the generated model photo
  prompt_used     TEXT,             -- exact prompt sent to provider
  scores          JSONB,            -- { overall_realism, color_accuracy, embroidery_accuracy,
                                    --   motif_accuracy, neckline_accuracy, sleeve_accuracy,
                                    --   border_accuracy, dupatta_accuracy,
                                    --   silhouette_accuracy, overall_similarity }
                                    --   each value: integer 1-5
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS benchmark_results_garment_idx ON benchmark_results(garment_id);
CREATE INDEX IF NOT EXISTS benchmark_results_provider_idx ON benchmark_results(provider);
