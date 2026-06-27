-- Meraki by Sam — Initial Schema
-- Migration 001

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function for server-side SQL execution
CREATE OR REPLACE FUNCTION run_sql(query text) RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ur TEXT,
  category TEXT,
  garment_type TEXT,
  season TEXT,
  colors TEXT,
  occasion TEXT,
  buyer_type TEXT,
  description_en TEXT,
  description_ur TEXT,
  price INTEGER,
  cost INTEGER,
  status TEXT DEFAULT 'available',
  reserved_for TEXT,
  customer_id UUID,
  photo TEXT,
  model_photo TEXT,
  ideogram_prompt TEXT,
  caption_en TEXT,
  caption_ur TEXT,
  hashtags TEXT,
  collection_name TEXT,
  exhibition_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sold_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  language TEXT DEFAULT 'en',
  size TEXT,
  budget_max INTEGER,
  preferred_colors TEXT,
  preferred_occasions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exhibitions
CREATE TABLE IF NOT EXISTS exhibitions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE,
  location TEXT,
  status TEXT DEFAULT 'upcoming',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exhibition items (which products go to which exhibition)
CREATE TABLE IF NOT EXISTS exhibition_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exhibition_id UUID REFERENCES exhibitions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration tracking
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  run_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for personal single-user app (Phase 1)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE exhibitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE exhibition_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE migrations DISABLE ROW LEVEL SECURITY;
