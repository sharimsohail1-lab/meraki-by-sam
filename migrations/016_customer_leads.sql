CREATE TABLE IF NOT EXISTS customer_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  state text,
  preferred_sizes jsonb DEFAULT '[]',
  preferred_contact text,
  interests jsonb DEFAULT '[]',
  notes text,
  source text DEFAULT 'manual',
  source_event text DEFAULT 'APPNA''26',
  exhibition_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_leads_phone_event ON customer_leads (phone, source_event) WHERE phone IS NOT NULL;
