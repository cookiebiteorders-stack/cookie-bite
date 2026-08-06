-- =============================================================================
-- Cookie Bite — Migration 0101: Performance indexes (PERF-01)
-- Purpose: Add indexes for common query patterns on orders and order_items
-- =============================================================================

-- Index on orders.payment_status for filtering by payment status
CREATE INDEX IF NOT EXISTS orders_payment_status_idx 
  ON public.orders (payment_status);

-- Index on order_items.product_id for filtering by product
CREATE INDEX IF NOT EXISTS order_items_product_id_idx 
  ON public.order_items (product_id);

-- Composite index for orders by payment_status and created_at (common admin query)
CREATE INDEX IF NOT EXISTS orders_payment_status_created_at_idx 
  ON public.orders (payment_status, created_at DESC);

COMMENT ON INDEX public.orders_payment_status_idx IS
'Index for filtering orders by payment status (PERF-01)';

COMMENT ON INDEX public.order_items_product_id_idx IS
'Index for filtering order items by product ID (PERF-01)';

COMMENT ON INDEX public.orders_payment_status_created_at_idx IS
'Composite index for admin queries filtering by payment status with recent orders first (PERF-01)';
