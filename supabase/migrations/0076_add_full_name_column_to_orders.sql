-- =============================================================================
-- Cookie Bite — Migration 0076: Add full_name column to orders table
-- Fixes: null value in column "full_name" of relation "orders" violates not-null constraint
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN full_name text;
  END IF;
END $$;

UPDATE public.orders
SET full_name = nullif(trim(shipping_address->>'name'), '')
WHERE (full_name IS NULL OR trim(full_name) = '')
  AND shipping_address IS NOT NULL
  AND nullif(trim(shipping_address->>'name'), '') IS NOT NULL;

UPDATE public.orders
SET full_name = 'Guest Customer'
WHERE full_name IS NULL OR trim(full_name) = '';

ALTER TABLE public.orders
  ALTER COLUMN full_name SET NOT NULL;

COMMENT ON COLUMN public.orders.full_name IS 'Customer name extracted from shipping_address';

CREATE OR REPLACE FUNCTION public.tg_orders_extract_customer_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.full_name IS NULL OR trim(NEW.full_name) = '') AND NEW.shipping_address IS NOT NULL THEN
    NEW.full_name := nullif(trim(NEW.shipping_address->>'name'), '');
  END IF;

  IF NEW.full_name IS NULL OR trim(NEW.full_name) = '' THEN
    NEW.full_name := 'Guest Customer';
  END IF;

  IF (NEW.phone IS NULL OR trim(NEW.phone) = '') AND NEW.shipping_address IS NOT NULL THEN
    NEW.phone := nullif(trim(NEW.shipping_address->>'phone'), '');
  END IF;

  IF NEW.phone IS NULL OR trim(NEW.phone) = '' THEN
    NEW.phone := '+201000000000';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_extract_phone ON public.orders;
DROP TRIGGER IF EXISTS trg_orders_extract_customer_fields ON public.orders;
CREATE TRIGGER trg_orders_extract_customer_fields
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_orders_extract_customer_fields();
