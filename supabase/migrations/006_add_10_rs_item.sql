-- Add one product priced at Rs 10
-- Idempotent: will not insert again if the title already exists

WITH target_subcategory AS (
  SELECT s.id AS subcategory_id, s.category_id
  FROM subcategories s
  ORDER BY s.created_at NULLS LAST, s.id
  LIMIT 1
),
sample_image AS (
  SELECT p.preview_image
  FROM products p
  WHERE p.preview_image IS NOT NULL AND p.preview_image <> ''
  ORDER BY p.created_at NULLS LAST, p.id
  LIMIT 1
)
INSERT INTO products (
  title,
  category_id,
  subcategory_id,
  price,
  description,
  preview_image
)
SELECT
  '10 Rs Special Item',
  t.category_id,
  t.subcategory_id,
  10.00,
  'Special low-price item available for Rs 10.',
  COALESCE((SELECT preview_image FROM sample_image), '/placeholder.svg')
FROM target_subcategory t
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE title = '10 Rs Special Item'
);

