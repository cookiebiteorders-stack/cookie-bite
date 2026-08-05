-- =============================================================================
-- Cookie Bite — Migration 0100: Scalability Critical Indexes
-- =============================================================================
-- This migration adds critical indexes to improve query performance under load
-- These indexes target the most frequently accessed queries in the application
-- =============================================================================

-- 1. Orders table - compound index for status filtering with time ordering
-- This improves the admin dashboard queries and order listing performance
CREATE INDEX IF NOT EXISTS idx_orders_created_at_status 
ON public.orders(created_at DESC, status);

-- 2. Orders table - compound index for payment analytics
-- Improves payment status queries and financial reporting
CREATE INDEX IF NOT EXISTS idx_orders_payment_status_created 
ON public.orders(payment_status, created_at DESC);

-- 3. Orders table - index for user order lookups
-- Improves customer order history queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created 
ON public.orders(user_id, created_at DESC);

-- 4. Products table - compound index for active product queries
-- Improves storefront product listing performance
CREATE INDEX IF NOT EXISTS idx_products_is_active_created 
ON public.products(is_active, created_at DESC);

-- 5. Products table - index for category filtering
-- Improves category-based product browsing
CREATE INDEX IF NOT EXISTS idx_products_category_active 
ON public.products(category, is_active);

-- 6. Products table - index for price range queries
-- Improves price filtering performance
CREATE INDEX IF NOT EXISTS idx_products_price_active 
ON public.products(price_egp, is_active);

-- 7. Order_items table - index for product-based order analysis
-- Improves product sales analytics and inventory tracking
CREATE INDEX IF NOT EXISTS idx_order_items_product_id 
ON public.order_items(product_id);

-- 8. Order_items table - compound index for order lookups
-- Improves order detail loading performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON public.order_items(order_id, created_at DESC);

-- 9. Users table - case-insensitive email index
-- Improves authentication and user lookup performance
CREATE INDEX IF NOT EXISTS idx_users_email_lower 
ON public.users(lower(email));

-- 10. Notification_jobs table - index for job processing
-- Improves background worker job selection performance
CREATE INDEX IF NOT EXISTS idx_notification_jobs_status_scheduled 
ON public.notification_jobs(status, scheduled_at);

-- 11. Reviews table - compound index for product reviews
-- Improves product review loading and aggregation
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved 
ON public.reviews(product_id, is_approved, created_at DESC);

-- 12. Audit_logs table - index for log filtering
-- Improves admin audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created 
ON public.audit_logs(action, created_at DESC);

-- Add comments for documentation
COMMENT ON INDEX idx_orders_created_at_status IS 'Compound index for order status filtering with time ordering - improves admin dashboard performance';
COMMENT ON INDEX idx_orders_payment_status_created IS 'Compound index for payment analytics - improves financial reporting queries';
COMMENT ON INDEX idx_orders_user_id_created IS 'Index for user order lookups - improves customer order history';
COMMENT ON INDEX idx_products_is_active_created IS 'Compound index for active products - improves storefront performance';
COMMENT ON INDEX idx_products_category_active IS 'Compound index for category filtering - improves product browsing';
COMMENT ON INDEX idx_products_price_active IS 'Index for price range queries - improves price filtering';
COMMENT ON INDEX idx_order_items_product_id IS 'Index for product-based analysis - improves sales analytics';
COMMENT ON INDEX idx_order_items_order_id IS 'Compound index for order lookups - improves order detail loading';
COMMENT ON INDEX idx_users_email_lower IS 'Case-insensitive email index - improves authentication performance';
COMMENT ON INDEX idx_notification_jobs_status_scheduled IS 'Index for job processing - improves background worker performance';
COMMENT ON INDEX idx_reviews_product_approved IS 'Compound index for product reviews - improves review loading';
COMMENT ON INDEX idx_audit_logs_action_created IS 'Index for log filtering - improves audit log queries';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Scalability critical indexes created successfully';
END $$;
