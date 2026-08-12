-- Release stock for already-cancelled unpaid orders
-- This script handles orders that were cancelled before stock release was implemented

-- Release stock from product_variants table (for variant orders)
UPDATE public.product_variants pv
SET stock = pv.stock + oi.quantity
FROM public.order_items oi
INNER JOIN public.orders o ON oi.order_id = o.id
WHERE o.status IN ('cancelled', 'refunded')
  AND o.payment_status = 'unpaid'
  AND oi.variant_id = pv.id
  AND oi.variant_id IS NOT NULL;

-- Release stock from products table (for standard products without variants)
UPDATE public.products p
SET stock = p.stock + oi.quantity
FROM public.order_items oi
INNER JOIN public.orders o ON oi.order_id = o.id
WHERE o.status IN ('cancelled', 'refunded')
  AND o.payment_status = 'unpaid'
  AND oi.product_id = p.id
  AND oi.product_id IS NOT NULL
  AND oi.variant_id IS NULL;

-- Verify the update
SELECT 
  COUNT(*) as affected_orders,
  SUM(oi.quantity) as total_quantity_released
FROM public.order_items oi
INNER JOIN public.orders o ON oi.order_id = o.id
WHERE o.status IN ('cancelled', 'refunded')
  AND o.payment_status = 'unpaid';
