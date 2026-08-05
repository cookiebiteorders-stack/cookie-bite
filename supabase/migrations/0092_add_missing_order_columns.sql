-- =============================================================================
-- Cookie Bite — Migration 0092: Add missing order columns for transactional checkout
-- Adds columns needed by create_checkout_order_transactional RPC function
-- =============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS gift_wrapping_fee_egp numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gift_box_snapshot jsonb;

COMMENT ON COLUMN public.orders.notes IS 'Customer notes / special instructions for the order';
COMMENT ON COLUMN public.orders.order_type IS 'Order type: standard, gift, subscription, etc.';
COMMENT ON COLUMN public.orders.gift_wrapping_fee_egp IS 'Fee for gift wrapping service';
COMMENT ON COLUMN public.orders.gift_box_snapshot IS 'Snapshot of gift box configuration at order time';
