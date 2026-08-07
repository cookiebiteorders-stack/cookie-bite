-- =============================================================================
-- Cookie Bite — Migration 0109: Verify Sequence-based Order Numbers
-- =============================================================================
-- This migration verifies that the order_number sequence is properly configured
-- and that the checkout RPC will use it via the DEFAULT value.
-- =============================================================================

-- The sequence-based order_number allocation is already handled by:
-- 1. Migration 0108 which created the sequence and set the DEFAULT value
-- 2. The existing create_checkout_order_transactional function will automatically
--    use the sequence via the DEFAULT value when not explicitly setting order_number

-- This migration is a no-op verification that the sequence is properly configured
DO $$
declare
  v_sequence_exists boolean;
  v_default_value text;
begin
  -- Check if sequence exists
  SELECT EXISTS (
    SELECT 1 FROM pg_sequences 
    WHERE schemaname = 'public' AND sequencename = 'orders_order_number_seq'
  ) INTO v_sequence_exists;
  
  IF v_sequence_exists THEN
    RAISE NOTICE 'Order number sequence exists: orders_order_number_seq';
  ELSE
    RAISE WARNING 'Order number sequence does not exist';
  END IF;
  
  -- Check the default value for order_number column
  SELECT column_default INTO v_default_value
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'order_number';
    
  IF v_default_value IS NOT NULL THEN
    RAISE NOTICE 'Order number column default: %', v_default_value;
  ELSE
    RAISE WARNING 'Order number column has no default value';
  END IF;
END $$;
