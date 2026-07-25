-- -----------------------------------------------------------------------------
-- Migration 0082: Force drop NOT NULL constraint on order_items.name column
-- The name column is jsonb type (legacy), we need to make it nullable
-- -----------------------------------------------------------------------------

-- Drop NOT NULL constraint from name column (jsonb type)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'name'
  ) THEN
    -- Backfill name column with jsonb structure if null
    UPDATE public.order_items
    SET name = jsonb_build_object('en', product_name, 'ar', product_name)
    WHERE name IS NULL AND product_name IS NOT NULL;
    
    -- Then drop the NOT NULL constraint
    ALTER TABLE public.order_items ALTER COLUMN name DROP NOT NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
