-- =============================================================================
-- Cookie Bite — Migration 0089: SQL Aggregate Views for Admin Stats and CRM
-- =============================================================================
-- This migration creates optimized materialized views for common admin queries:
-- - Daily sales metrics
-- - Customer analytics
-- - Product performance
-- - Order status breakdowns
-- - Revenue trends
-- 
-- These views improve query performance and provide consistent data for dashboards.
-- =============================================================================

-- Drop existing views if they exist (for idempotent migration)
DROP MATERIALIZED VIEW IF EXISTS public.daily_sales_metrics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.customer_analytics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.product_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.order_status_breakdown CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.revenue_trends CASCADE;

-- Daily Sales Metrics View
CREATE MATERIALIZED VIEW public.daily_sales_metrics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_orders,
  COUNT(*) FILTER (WHERE payment_status = 'unpaid') as unpaid_orders,
  COUNT(*) FILTER (WHERE payment_status = 'refunded') as refunded_orders,
  COALESCE(SUM(total_egp), 0) as total_revenue_egp,
  COALESCE(SUM(total_egp) FILTER (WHERE payment_status = 'paid'), 0) as paid_revenue_egp,
  COALESCE(SUM(total_egp) FILTER (WHERE payment_status = 'refunded'), 0) as refunded_amount_egp,
  COALESCE(AVG(total_egp), 0) as average_order_value_egp,
  COUNT(DISTINCT user_id) as unique_customers,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as registered_customers,
  COUNT(*) FILTER (WHERE user_id IS NULL) as guest_orders
FROM public.orders
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create index on date for efficient querying
CREATE INDEX idx_daily_sales_metrics_date ON public.daily_sales_metrics(date DESC);

-- Customer Analytics View
CREATE MATERIALIZED VIEW public.customer_analytics AS
SELECT
  u.id as user_id,
  u.email,
  u.full_name,
  u.role,
  u.created_at as account_created_at,
  COUNT(o.id) as total_orders,
  COALESCE(SUM(o.total_egp), 0) as total_spent_egp,
  COALESCE(AVG(o.total_egp), 0) as average_order_value_egp,
  MAX(o.created_at) as last_order_at,
  MIN(o.created_at) as first_order_at,
  COUNT(o.id) FILTER (WHERE o.payment_status = 'paid') as paid_orders,
  COUNT(o.id) FILTER (WHERE o.payment_status = 'refunded') as refunded_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'pending') as pending_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'processing') as processing_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'shipped') as shipped_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'delivered') as delivered_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'cancelled') as cancelled_orders,
  EXTRACT(DAY FROM (MAX(o.created_at) - MIN(o.created_at))) as days_since_first_order,
  CASE
    WHEN COUNT(o.id) = 0 THEN 'new'
    WHEN COUNT(o.id) = 1 THEN 'first_time'
    WHEN COUNT(o.id) BETWEEN 2 AND 5 THEN 'occasional'
    WHEN COUNT(o.id) > 5 THEN 'loyal'
  END as customer_segment
FROM public.users u
LEFT JOIN public.orders o ON u.id = o.user_id
GROUP BY u.id, u.email, u.full_name, u.role, u.created_at
ORDER BY total_spent_egp DESC;

-- Create indexes for common queries
CREATE INDEX idx_customer_analytics_email ON public.customer_analytics(email);
CREATE INDEX idx_customer_analytics_role ON public.customer_analytics(role);
CREATE INDEX idx_customer_analytics_segment ON public.customer_analytics(customer_segment);

-- Product Performance View
CREATE MATERIALIZED VIEW public.product_performance AS
SELECT
  p.id as product_id,
  p.slug,
  p.name,
  p.title_en,
  p.title_ar,
  p.category,
  p.price_egp,
  p.compare_price_egp,
  p.stock,
  p.is_active,
  p.created_at as product_created_at,
  COUNT(oi.id) as total_items_sold,
  COALESCE(SUM(oi.quantity), 0) as total_quantity_sold,
  COALESCE(SUM(oi.quantity * oi.unit_price_egp), 0) as total_revenue_egp,
  COALESCE(AVG(oi.unit_price_egp), 0) as average_selling_price_egp,
  COUNT(DISTINCT oi.order_id) as unique_orders,
  COUNT(DISTINCT o.user_id) as unique_customers,
  p.stock - COALESCE(SUM(oi.quantity), 0) as remaining_stock,
  CASE
    WHEN p.stock = 0 THEN 'out_of_stock'
    WHEN p.stock <= 5 THEN 'low_stock'
    WHEN p.stock <= 20 THEN 'medium_stock'
    ELSE 'in_stock'
  END as stock_status,
  ROUND((COALESCE(SUM(oi.quantity), 0)::numeric / NULLIF(p.stock, 0)) * 100, 2) as stock_turnover_percentage
FROM public.products p
LEFT JOIN public.order_items oi ON p.id::text = oi.product_id
LEFT JOIN public.orders o ON oi.order_id = o.id AND o.payment_status = 'paid'
GROUP BY p.id, p.slug, p.name, p.title_en, p.title_ar, p.category, p.price_egp, p.compare_price_egp, p.stock, p.is_active, p.created_at
ORDER BY total_revenue_egp DESC;

-- Create indexes
CREATE INDEX idx_product_performance_slug ON public.product_performance(slug);
CREATE INDEX idx_product_performance_category ON public.product_performance(category);
CREATE INDEX idx_product_performance_stock_status ON public.product_performance(stock_status);

-- Order Status Breakdown View
CREATE MATERIALIZED VIEW public.order_status_breakdown AS
SELECT
  status,
  payment_status,
  COUNT(*) as order_count,
  COALESCE(SUM(total_egp), 0) as total_value_egp,
  COALESCE(AVG(total_egp), 0) as average_value_egp,
  MIN(created_at) as oldest_order,
  MAX(created_at) as newest_order,
  COUNT(DISTINCT user_id) as unique_customers,
  COUNT(*) FILTER (WHERE user_id IS NULL) as guest_orders
FROM public.orders
GROUP BY status, payment_status
ORDER BY order_count DESC;

-- Revenue Trends View (last 90 days)
CREATE MATERIALIZED VIEW public.revenue_trends AS
SELECT
  DATE(created_at) as date,
  EXTRACT(WEEK FROM created_at) as week_number,
  EXTRACT(MONTH FROM created_at) as month_number,
  EXTRACT(YEAR FROM created_at) as year,
  COUNT(*) as total_orders,
  COALESCE(SUM(total_egp), 0) as daily_revenue_egp,
  COALESCE(SUM(total_egp) FILTER (WHERE payment_status = 'paid'), 0) as paid_revenue_egp,
  COALESCE(SUM(total_egp) FILTER (WHERE payment_status = 'refunded'), 0) as refunded_revenue_egp,
  COUNT(DISTINCT user_id) as unique_customers,
  COALESCE(SUM(delivery_fee_egp), 0) as total_delivery_fee_egp,
  COALESCE(SUM(discount_amount_egp), 0) as total_discount_egp,
  COALESCE(SUM(gift_wrapping_fee_egp), 0) as total_gift_wrapping_fee_egp
FROM public.orders
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at), EXTRACT(WEEK FROM created_at), EXTRACT(MONTH FROM created_at), EXTRACT(YEAR FROM created_at)
ORDER BY date DESC;

-- Create index
CREATE INDEX idx_revenue_trends_date ON public.revenue_trends(date DESC);

-- Create refresh function for materialized views
CREATE OR REPLACE FUNCTION public.refresh_admin_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_sales_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.customer_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.product_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.order_status_breakdown;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.revenue_trends;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.daily_sales_metrics TO authenticated;
GRANT SELECT ON public.customer_analytics TO authenticated;
GRANT SELECT ON public.product_performance TO authenticated;
GRANT SELECT ON public.order_status_breakdown TO authenticated;
GRANT SELECT ON public.revenue_trends TO authenticated;

-- Only service_role can refresh views
REVOKE ALL ON FUNCTION public.refresh_admin_views() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_admin_views() TO service_role;

-- Add comments
COMMENT ON MATERIALIZED VIEW public.daily_sales_metrics IS 'Daily sales metrics including orders, revenue, and customer counts';
COMMENT ON MATERIALIZED VIEW public.customer_analytics IS 'Customer analytics with order history, spending, and segmentation';
COMMENT ON MATERIALIZED VIEW public.product_performance IS 'Product performance metrics including sales, revenue, and stock status';
COMMENT ON MATERIALIZED VIEW public.order_status_breakdown IS 'Order status breakdown by status and payment status';
COMMENT ON MATERIALIZED VIEW public.revenue_trends IS 'Revenue trends over the last 90 days with daily breakdown';
COMMENT ON FUNCTION public.refresh_admin_views() IS 'Refresh all admin materialized views concurrently';
