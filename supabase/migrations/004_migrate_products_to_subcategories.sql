-- Add subcategory_id column to products table (nullable initially)
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES subcategories(id) ON DELETE CASCADE;

-- Create default subcategory for each existing category
-- This will create a subcategory named "{Category Name} - All" for each category
DO $$
DECLARE
  cat RECORD;
  default_subcategory_id UUID;
BEGIN
  FOR cat IN SELECT id, name, slug FROM categories LOOP
    -- Create default subcategory
    INSERT INTO subcategories (name, slug, category_id, icon)
    VALUES (
      cat.name || ' - All',
      cat.slug || '-all',
      cat.id,
      NULL
    )
    ON CONFLICT (category_id, slug) DO NOTHING
    RETURNING id INTO default_subcategory_id;
    
    -- If subcategory was created, update products
    IF default_subcategory_id IS NOT NULL THEN
      UPDATE products
      SET subcategory_id = default_subcategory_id
      WHERE category_id = cat.id AND subcategory_id IS NULL;
    ELSE
      -- If subcategory already exists, get its ID
      SELECT id INTO default_subcategory_id
      FROM subcategories
      WHERE category_id = cat.id AND slug = cat.slug || '-all';
      
      -- Update products with existing subcategory
      UPDATE products
      SET subcategory_id = default_subcategory_id
      WHERE category_id = cat.id AND subcategory_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- Make subcategory_id NOT NULL after migration
ALTER TABLE products ALTER COLUMN subcategory_id SET NOT NULL;

-- Create index on subcategory_id for faster queries
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);
