-- Check order_items table schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'order_items'
AND table_schema = 'public'
ORDER BY ordinal_position;
