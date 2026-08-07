-- Migration: Add shipping_method column to orders table
-- Phase 1, Task 1.2: Add shipping method tracking

-- Add shipping_method column if it doesn't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_method text;

-- Add comment documenting the shipping method
COMMENT ON COLUMN public.orders.shipping_method IS 
'Selected shipping method: standard, express, etc.';

-- Create index for filtering by shipping method (partial index for performance)
CREATE INDEX IF NOT EXISTS orders_shipping_method_idx 
ON public.orders (shipping_method) 
WHERE shipping_method IS NOT NULL;
