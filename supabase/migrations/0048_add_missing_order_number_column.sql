-- =============================================================================
-- Cookie Bite — Migration 0048: Add missing orders columns
-- Fixes: column orders.order_number does not exist error
-- Fixes: record "new" has no field "is_gift" error
-- These columns were defined in earlier migrations but appear to be missing in production
-- =============================================================================

-- Add the order_number column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='order_number'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN order_number serial unique;
  END IF;
END $$;

-- Add the currency column if it doesn't exist (needed by tg_orders_sync_legacy_modern trigger)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='currency'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN currency text not null default 'EGP';
  END IF;
END $$;

-- Add or make nullable the number column (legacy column referenced in order-row-compat.ts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='number'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN number text;
  ELSE
    -- Column exists but may have NOT NULL constraint, make it nullable
    BEGIN
      ALTER TABLE public.orders 
        ALTER COLUMN number DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN
      -- Column doesn't have NOT NULL constraint, ignore
      NULL;
    END;
  END IF;
END $$;

-- Add legacy columns referenced in tg_orders_sync_legacy_modern trigger
-- These columns are used for backward compatibility with old schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='subtotal'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN subtotal numeric(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='delivery_fee'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN delivery_fee numeric(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='total'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN total numeric(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='email'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN email text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='address'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN address jsonb;
  END IF;
END $$;

-- Add other columns that may be missing (defined in 0003_v2_extend_schema.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='is_gift'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN is_gift boolean not null default false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='whatsapp_confirmed'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN whatsapp_confirmed boolean not null default false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='language'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN language text not null default 'ar' check (language in ('en','ar'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='discount_amount_egp'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN discount_amount_egp numeric(10,2) not null default 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='gift_wrapping_fee_egp'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN gift_wrapping_fee_egp numeric(10,2) not null default 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='gift_message'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN gift_message text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='orders' 
      AND column_name='delivery_slot'
  ) THEN
    ALTER TABLE public.orders 
      ADD COLUMN delivery_slot text;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS orders_order_number_idx 
  ON public.orders (order_number);

CREATE INDEX IF NOT EXISTS orders_language_idx 
  ON public.orders (language);
