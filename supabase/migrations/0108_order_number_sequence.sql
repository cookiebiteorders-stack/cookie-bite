-- =============================================================================
-- Cookie Bite — Migration 0108: Order Number Sequence
-- =============================================================================
-- This migration creates a sequence for order numbers to replace the MAX()+1 pattern
-- which causes concurrency issues and poor performance at scale.
-- =============================================================================

-- Create a sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS public.orders_order_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Set the sequence start value to be higher than the current max order number
DO $$
declare
  v_max_order_number int;
begin
  SELECT COALESCE(MAX(order_number), 0) INTO v_max_order_number
  FROM public.orders;
  
  -- Set sequence to start after the current max order number
  PERFORM setval(
    'public.orders_order_number_seq', 
    v_max_order_number + 1, 
    false
  );
  
  RAISE NOTICE 'Order number sequence initialized to start at %', v_max_order_number + 1;
END $$;

-- Set the default value for order_number column
ALTER TABLE public.orders
  ALTER COLUMN order_number 
  SET DEFAULT nextval('public.orders_order_number_seq');

-- Add a comment documenting the change
COMMENT ON SEQUENCE public.orders_order_number_seq IS 
'Sequence for allocating order numbers atomically, replacing MAX()+1 pattern for better concurrency';

COMMENT ON COLUMN public.orders.order_number IS 
'Order number allocated from orders_order_number_seq sequence for atomic allocation';
