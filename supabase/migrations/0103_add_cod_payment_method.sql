-- Migration: Add cash_on_delivery payment method support
-- Phase 1, Task 1.1: Add COD to payment_method constraint

-- Drop existing payment_method check constraint if it exists
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- Add updated constraint with COD support
ALTER TABLE public.orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('card', 'wallet', 'cash_on_delivery', 'bank_transfer'));

-- Add comment documenting the supported payment methods
COMMENT ON COLUMN public.orders.payment_method IS 
'Payment method: card (Paymob card), wallet (Paymob wallet), cash_on_delivery, bank_transfer';
