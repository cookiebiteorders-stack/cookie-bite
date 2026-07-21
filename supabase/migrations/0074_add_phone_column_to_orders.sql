-- =============================================================================
-- Cookie Bite — Migration 0074: Add phone column to orders table
-- Fixes: null value in column "phone" of relation "orders" violates not-null constraint
-- 
-- The orders table needs a phone column to store customer phone numbers.
-- Phone is extracted from shipping_address jsonb during order creation.
-- =============================================================================

-- Add phone column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='phone'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN phone text;
  END IF;
END $$;

-- Backfill phone from shipping_address for existing orders
UPDATE public.orders
SET phone = (shipping_address->>'phone')
WHERE phone IS NULL 
  AND shipping_address IS NOT NULL 
  AND shipping_address->>'phone' IS NOT NULL;

-- Set phone to placeholder for orders without phone in shipping_address
UPDATE public.orders
SET phone = '+201000000000'
WHERE phone IS NULL;

-- Make phone column NOT NULL
ALTER TABLE public.orders
  ALTER COLUMN phone SET NOT NULL;

-- Add comment
COMMENT ON COLUMN public.orders.phone IS 'Customer phone number extracted from shipping_address';

-- Update the trigger function to automatically extract phone from shipping_address
CREATE OR REPLACE FUNCTION public.tg_orders_extract_phone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Extract phone from shipping_address if not already set
  IF NEW.phone IS NULL AND NEW.shipping_address IS NOT NULL THEN
    NEW.phone := (NEW.shipping_address->>'phone');
  END IF;
  
  -- Set placeholder if still null
  IF NEW.phone IS NULL OR NEW.phone = '' THEN
    NEW.phone := '+201000000000';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run before insert/update on orders
DROP TRIGGER IF EXISTS trg_orders_extract_phone ON public.orders;
CREATE TRIGGER trg_orders_extract_phone
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_orders_extract_phone();
