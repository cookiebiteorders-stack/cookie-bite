-- Release stock for already-cancelled unpaid orders
-- This migration handles orders that were cancelled before stock release was implemented
-- This is a one-time data fix migration

-- Release stock from product_variants table (for variant orders)
UPDATE public.product_variants pv
SET stock = pv.stock + oi.quantity
FROM public.order_items oi
INNER JOIN public.orders o ON oi.order_id = o.id
WHERE o.status IN ('cancelled', 'refunded')
  AND o.payment_status = 'unpaid'
  AND oi.variant_id::text = pv.id::text
  AND oi.variant_id IS NOT NULL;

-- Release stock from products table (for standard products without variants)
UPDATE public.products p
SET stock = p.stock + oi.quantity
FROM public.order_items oi
INNER JOIN public.orders o ON oi.order_id = o.id
WHERE o.status IN ('cancelled', 'refunded')
  AND o.payment_status = 'unpaid'
  AND oi.product_id::text = p.id::text
  AND oi.product_id IS NOT NULL
  AND oi.variant_id IS NULL;

-- Log the number of affected orders for verification
DO $$
DECLARE
  v_count INTEGER;
  v_quantity INTEGER;
BEGIN
  SELECT 
    COUNT(DISTINCT oi.order_id),
    SUM(oi.quantity)
  INTO v_count, v_quantity
  FROM public.order_items oi
  INNER JOIN public.orders o ON oi.order_id = o.id
  WHERE o.status IN ('cancelled', 'refunded')
    AND o.payment_status = 'unpaid';
  
  RAISE NOTICE 'Stock release completed: % orders affected, % total quantity restored', v_count, COALESCE(v_quantity, 0);
END $$;
