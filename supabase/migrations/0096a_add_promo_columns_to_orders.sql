-- =============================================================================
-- Cookie Bite — Migration 0096: Add promo columns to orders table
-- Adds promo_code and promo_id columns needed by create_checkout_order_transactional
-- =============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS promo_id uuid;

COMMENT ON COLUMN public.orders.promo_code IS 'Promo code used for the order';
COMMENT ON COLUMN public.orders.promo_id IS 'Reference to the promo used for the order';
