-- Migration: Add 'confirmed' status to orders table
-- Phase 1, Task 1.3: Update order status to include 'confirmed'

-- Drop existing status check constraint if it exists
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add updated constraint with 'confirmed' status
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'));

-- Update comment to document the status meanings
COMMENT ON COLUMN public.orders.status IS 
'Order status: pending (awaiting payment/confirmation), processing (being prepared), confirmed (paid and confirmed), shipped, delivered, cancelled, refunded';
