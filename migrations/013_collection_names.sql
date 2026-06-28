-- Multi-collection membership per product.
-- Stored as JSONB array: ["Summer Edition", "Eid Picks"]
-- Legacy collection_name is kept as the primary/first collection for backwards compatibility.
ALTER TABLE products ADD COLUMN IF NOT EXISTS collection_names JSONB;
