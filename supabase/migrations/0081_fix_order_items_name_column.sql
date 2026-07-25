-- -----------------------------------------------------------------------------
-- Migration 0081: Fix order_items name column constraint
-- The database has a 'name' column (likely jsonb from legacy) that is NOT NULL
-- This migration makes it nullable since we use 'product_name' (text) instead
-- -----------------------------------------------------------------------------

-- Make name column nullable if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.order_items ALTER COLUMN name DROP NOT NULL;
  END IF;
END $$;

-- Update trigger to handle name column safely
CREATE OR REPLACE FUNCTION public.tg_order_items_normalize()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  snap jsonb;
BEGIN
  snap := COALESCE(NEW.product_snapshot, '{}'::jsonb);

  -- Ensure product_name is populated
  IF NEW.product_name IS NULL OR trim(NEW.product_name) = '' THEN
    NEW.product_name := COALESCE(
      nullif(trim(snap->>'name'), ''),
      nullif(trim(snap->>'title'), ''),
      'Unknown item'
    );
  END IF;

  -- Ensure name column (if it exists) is populated from product_name
  -- This handles the legacy jsonb name column
  IF NEW.name IS NULL THEN
    NEW.name := NEW.product_name;
  END IF;

  NEW.unit_price_egp := COALESCE(NEW.unit_price_egp, 0);
  NEW.quantity := COALESCE(NEW.quantity, 1);

  NEW.total_price_egp := COALESCE(
    NEW.total_price_egp,
    NEW.final_total_egp,
    NEW.unit_price_egp * NEW.quantity
  );

  NEW.final_total_egp := COALESCE(NEW.final_total_egp, NEW.total_price_egp);
  NEW.selected_addons := COALESCE(NEW.selected_addons, '[]'::jsonb);
  NEW.addons_total_egp := COALESCE(NEW.addons_total_egp, 0);

  IF NEW.product_snapshot IS NULL THEN
    NEW.product_snapshot := jsonb_build_object(
      'name', NEW.product_name,
      'unit_price_egp', NEW.unit_price_egp
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_normalize ON public.order_items;
CREATE TRIGGER trg_order_items_normalize
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_order_items_normalize();

NOTIFY pgrst, 'reload schema';
