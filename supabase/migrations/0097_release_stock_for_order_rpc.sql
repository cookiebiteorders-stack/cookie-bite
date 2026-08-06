-- =============================================================================
-- Cookie Bite — Migration 0097: Stock release RPC and expired order cleanup (DB-01)
-- Purpose: Fix critical inventory leak where stock is decremented before payment
-- and never released on failure/abandon/expired orders
-- =============================================================================

-- Create function to release stock for a specific order
CREATE OR REPLACE FUNCTION public.release_stock_for_order(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_exists boolean;
BEGIN
  -- Check if order exists and is in unpaid/failed status
  SELECT EXISTS(
    SELECT 1 FROM public.orders 
    WHERE id = p_order_id 
    AND payment_status IN ('unpaid', 'failed')
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
  UPDATE public.products p
  SET stock = p.stock + oi.quantity
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id 
    AND oi.product_id = p.id
    AND oi.product_id IS NOT NULL
    AND oi.variant_id IS NULL;

  -- Cancel the order
  UPDATE public.orders 
  SET status = 'cancelled', 
      updated_at = now(),
      payment_status = 'cancelled'
  WHERE id = p_order_id 
    AND payment_status IN ('unpaid', 'failed');
END $$;

-- Grant execute permission to service_role only
REVOKE ALL ON FUNCTION public.release_stock_for_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_stock_for_order(uuid) TO service_role;

COMMENT ON FUNCTION public.release_stock_for_order IS
'Releases stock for unpaid/failed orders and cancels them. Called from webhook on payment failure and from cron job for expired unpaid orders.';

-- Create function to cancel expired unpaid orders (for cron job)
CREATE OR REPLACE FUNCTION public.cancel_expired_unpaid_orders(p_hours_ago integer DEFAULT 1)
RETURNS TABLE (
  order_id uuid,
  order_code text,
  cancelled_at timestamp with time zone
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_record RECORD;
BEGIN
  -- Find unpaid orders older than the specified hours (default: 1 hour)
  -- Paymob intentions expire after 3600s (1 hour)
  FOR v_order_record IN 
    SELECT id, order_code 
    FROM public.orders 
    WHERE payment_status = 'unpaid' 
      AND status = 'pending'
      AND created_at < now() - (p_hours_ago || ' hours')::interval
  LOOP
    -- Release stock for this order
    PERFORM public.release_stock_for_order(v_order_record.id);
    
    RETURN NEXT;
  END LOOP;
END $$;

-- Grant execute permission to service_role only
REVOKE ALL ON FUNCTION public.cancel_expired_unpaid_orders(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_expired_unpaid_orders(integer) TO service_role;

COMMENT ON FUNCTION public.cancel_expired_unpaid_orders IS
'Cancels unpaid orders older than specified hours (default: 1 hour) and releases their stock. Intended for cron job execution.';
