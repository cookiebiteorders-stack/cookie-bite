-- =============================================================================
-- Cookie Bite — Migration 0106: Order Gateway Init Failed Status
-- =============================================================================
-- This migration adds support for gateway_init_failed status to handle gateway 
-- initialization failures and prevents orphaned unpaid orders from accumulating.
-- =============================================================================

-- Add a comment documenting the supported status values (status is text, not enum)
COMMENT ON COLUMN public.orders.status IS 
'Order status: pending, processing, shipped, delivered, cancelled, returned, gateway_init_failed';

-- Create a function to clean up orphaned orders (optional cleanup job)
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_orders(
  p_hours_ago int DEFAULT 24
)
RETURNS TABLE(cleaned_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_cleaned_count int;
begin
  -- Cancel unpaid orders that have been in gateway_init_failed status for too long
  update public.orders
  set status = 'cancelled',
      updated_at = now()
  where status = 'gateway_init_failed'
    and payment_status = 'unpaid'
    and created_at < now() - (p_hours_ago || ' hours')::interval;

  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;

  return query select v_cleaned_count;
END;
$$;

-- Grant execute permissions to service_role only
REVOKE ALL ON FUNCTION public.cleanup_orphaned_orders(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_orders(int) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.cleanup_orphaned_orders(int) IS 
'Cleans up orphaned orders that failed gateway initialization after specified hours';
