-- =============================================================================
-- Migration: Fix Paymob integration issues
-- Issues fixed:
-- 1. Add 'gateway_init_failed' to orders_status_check constraint
-- 2. Fix text = uuid type mismatch in release_stock_for_order RPC
-- =============================================================================

-- Issue 1: Add 'gateway_init_failed' to orders_status_check constraint
-- This status is used when Paymob intention creation fails

-- Drop existing constraint if it exists
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add updated constraint with 'gateway_init_failed' status
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'pending', 
  'processing', 
  'confirmed', 
  'shipped', 
  'delivered', 
  'cancelled', 
  'refunded',
  'gateway_init_failed'
));

-- Update comment to document the status meanings
COMMENT ON COLUMN public.orders.status IS 
'Order status: pending (awaiting payment/confirmation), processing (being prepared), confirmed (paid and confirmed), shipped, delivered, cancelled, refunded, gateway_init_failed (payment gateway initialization failed)';

-- Issue 2: Fix text = uuid type mismatch in release_stock_for_order RPC
-- The issue is in the comparison between oi.product_id (text) and p.id (uuid)
-- We need to cast p.id to text for proper comparison

CREATE OR REPLACE FUNCTION public.release_stock_for_order(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_exists boolean;
BEGIN
  -- Check if order exists and is in unpaid/failed status
  SELECT EXISTS(
    SELECT 1 FROM public.orders 
    WHERE id = p_order_id 
    AND payment_status IN ('unpaid', 'failed', 'gateway_init_failed')
  ) INTO v_order_exists;

  IF NOT v_order_exists THEN
    RAISE EXCEPTION 'Order not found or not eligible for stock release: %', p_order_id;
  END IF;

  -- Release stock from product_variants table (for variant orders) - do this first
  UPDATE public.product_variants pv
  SET stock = pv.stock + oi.quantity
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id 
    AND oi.variant_id = pv.id
    AND oi.variant_id IS NOT NULL;

  -- Release stock from products table (for standard products without variants)
  -- FIXED: Cast p.id to text to match oi.product_id type
  UPDATE public.products p
  SET stock = p.stock + oi.quantity
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id 
    AND oi.product_id = p.id::text
    AND oi.product_id IS NOT NULL
    AND oi.variant_id IS NULL;

  -- Cancel the order
  UPDATE public.orders 
  SET status = 'cancelled', 
      updated_at = now(),
      payment_status = 'cancelled'
  WHERE id = p_order_id 
    AND payment_status IN ('unpaid', 'failed', 'gateway_init_failed');
END $$;

-- Grant execute permission to service_role only
REVOKE ALL ON FUNCTION public.release_stock_for_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_stock_for_order(uuid) TO service_role;

COMMENT ON FUNCTION public.release_stock_for_order IS
'Releases stock for unpaid/failed/gateway_init_failed orders and cancels them. Called from webhook on payment failure and from checkout on gateway init failure.';
