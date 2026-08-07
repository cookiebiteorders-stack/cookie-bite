-- =============================================================================
-- Cookie Bite — Migration 0105: Safe Order Cancellation RPC
-- =============================================================================
-- This migration creates a transactional RPC function for safe order cancellation
-- that enforces payment_status checks and stock reconciliation.
-- =============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.cancel_unpaid_order_transactional CASCADE;

-- Create safe order cancellation function
CREATE OR REPLACE FUNCTION public.cancel_unpaid_order_transactional(
  p_order_id uuid,
  p_user_id uuid
)
RETURNS TABLE(success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_order_status text;
  v_payment_status text;
  v_order_user_id uuid;
begin
  -- Get current order state
  select status, payment_status, user_id
  into v_order_status, v_payment_status, v_order_user_id
  from public.orders
  where id = p_order_id;

  -- Check if order exists
  if v_order_status is null then
    return query select false, 'Order not found';
  end if;

  -- Verify ownership
  if v_order_user_id != p_user_id then
    return query select false, 'Order does not belong to user';
  end if;

  -- Only allow cancellation of unpaid pending orders
  if v_payment_status != 'unpaid' then
    return query select false, 'Only unpaid orders can be cancelled';
  end if;

  if v_order_status != 'pending' then
    return query select false, 'Only pending orders can be cancelled';
  end if;

  -- Update order status to cancelled
  update public.orders
  set status = 'cancelled', updated_at = now()
  where id = p_order_id;

  -- Release stock for all order items
  update public.product_variants pv
  set stock_quantity = stock_quantity + oi.quantity,
      updated_at = now()
  from public.order_items oi
  where oi.order_id = p_order_id
    and oi.variant_id = pv.id;

  -- Also release stock for products without variants
  update public.products p
  set stock_quantity = stock_quantity + oi.quantity,
      updated_at = now()
  from public.order_items oi
  where oi.order_id = p_order_id
    and oi.product_id = p.id
    and oi.variant_id is null;

  return query select true, null::text;
END;
$$;

-- Grant execute permissions to service_role only
REVOKE ALL ON FUNCTION public.cancel_unpaid_order_transactional(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_unpaid_order_transactional(uuid, uuid) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.cancel_unpaid_order_transactional(uuid, uuid) IS 
'Safely cancels unpaid pending orders with ownership verification, payment status checks, and atomic stock release';
