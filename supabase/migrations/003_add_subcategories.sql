-- Create subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure slug is unique within a category
  UNIQUE(category_id, slug)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_slug ON subcategories(slug);

-- Enable Row Level Security
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Subcategories are viewable by everyone" ON subcategories;
DROP POLICY IF EXISTS "Admins can insert subcategories" ON subcategories;
DROP POLICY IF EXISTS "Admins can update subcategories" ON subcategories;
DROP POLICY IF EXISTS "Admins can delete subcategories" ON subcategories;

-- RLS Policies for subcategories
-- Public read access
CREATE POLICY "Subcategories are viewable by everyone"
  ON subcategories FOR SELECT
  USING (true);

-- Admin-only write access (authenticated users can insert/update/delete)
CREATE POLICY "Admins can insert subcategories"
  ON subcategories FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update subcategories"
  ON subcategories FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete subcategories"
  ON subcategories FOR DELETE
  USING (auth.role() = 'authenticated');

-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS update_subcategories_updated_at ON subcategories;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_subcategories_updated_at
  BEFORE UPDATE ON subcategories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add subcategory_id column to products table (nullable initially for migration)
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES subcategories(id) ON DELETE CASCADE;

-- Create index on subcategory_id
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);

-- Data migration: Create default subcategories and assign products
DO $$
DECLARE
  cat_record RECORD;
  default_subcat_id UUID;
  prod_record RECORD;
BEGIN
  -- Loop through each category
  FOR cat_record IN SELECT id, name, slug, icon FROM categories LOOP
    -- Create a default "General" subcategory for this category
    INSERT INTO subcategories (name, slug, category_id, icon)
    VALUES ('General', 'general', cat_record.id, cat_record.icon)
    ON CONFLICT (category_id, slug) DO NOTHING
    RETURNING id INTO default_subcat_id;
    
    -- If subcategory already exists, get its ID
    IF default_subcat_id IS NULL THEN
      SELECT id INTO default_subcat_id
      FROM subcategories
      WHERE category_id = cat_record.id AND slug = 'general';
    END IF;
    
    -- Assign all products from this category to the default subcategory
    UPDATE products
    SET subcategory_id = default_subcat_id
    WHERE category_id = cat_record.id AND subcategory_id IS NULL;
  END LOOP;
END $$;

-- After migration, make subcategory_id NOT NULL
-- Note: This will fail if any products still have NULL subcategory_id
-- In that case, you'll need to manually assign them
ALTER TABLE products ALTER COLUMN subcategory_id SET NOT NULL;

-- Drop the old category_id column from products (optional - keeping for reference)
-- Uncomment the next line if you want to remove it completely:
-- ALTER TABLE products DROP COLUMN category_id;

-- Drop the old index on category_id if we're removing the column
-- DROP INDEX IF EXISTS idx_products_category_id;
