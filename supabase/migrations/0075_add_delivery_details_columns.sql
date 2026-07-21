-- =============================================================================
-- Cookie Bite — Migration 0075: Add delivery details columns to orders table
-- Adds support for enhanced delivery information collected in checkout details page
-- =============================================================================

-- Add phone_secondary column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='phone_secondary'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN phone_secondary text;
  END IF;
END $$;

-- Add governorate column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='governorate'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN governorate text;
  END IF;
END $$;

-- Add delivery_date column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='delivery_date'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN delivery_date date;
  END IF;
END $$;

-- Add delivery_time column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='delivery_time'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN delivery_time text;
  END IF;
END $$;

-- Add latitude column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='latitude'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN latitude numeric(10, 8);
  END IF;
END $$;

-- Add longitude column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='longitude'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN longitude numeric(11, 8);
  END IF;
END $$;

-- Add place_label column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='place_label'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN place_label text;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.orders.phone_secondary IS 'Secondary phone number for delivery contact';
COMMENT ON COLUMN public.orders.governorate IS 'Governorate/region for delivery address';
COMMENT ON COLUMN public.orders.delivery_date IS 'Requested delivery date';
COMMENT ON COLUMN public.orders.delivery_time IS 'Preferred delivery time slot';
COMMENT ON COLUMN public.orders.latitude IS 'GPS latitude for delivery location';
COMMENT ON COLUMN public.orders.longitude IS 'GPS longitude for delivery location';
COMMENT ON COLUMN public.orders.place_label IS 'Human-readable label for GPS location';

-- Create index on delivery_date for scheduling queries
CREATE INDEX IF NOT EXISTS orders_delivery_date_idx ON public.orders (delivery_date);
