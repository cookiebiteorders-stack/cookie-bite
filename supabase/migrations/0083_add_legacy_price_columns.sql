-- -----------------------------------------------------------------------------
-- Migration 0083: Add legacy price columns to order_items
-- These columns are needed for compatibility with existing code
-- -----------------------------------------------------------------------------

-- Add legacy unit_price column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN unit_price numeric(10,2);
    
    -- Backfill from unit_price_egp
    UPDATE public.order_items
    SET unit_price = unit_price_egp
    WHERE unit_price IS NULL;
  END IF;
END $$;

-- Add legacy total_price column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'total_price'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN total_price numeric(10,2);
    
    -- Backfill from total_price_egp or final_total_egp
    UPDATE public.order_items
    SET total_price = COALESCE(total_price_egp, final_total_egp, unit_price_egp * quantity)
    WHERE total_price IS NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
