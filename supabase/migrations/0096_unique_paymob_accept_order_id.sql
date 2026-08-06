-- =============================================================================
-- Cookie Bite — Migration 0096: Add UNIQUE constraint on paymob_accept_order_id (PAY-03)
-- Purpose: Prevent duplicate Paymob order IDs and ensure one webhook updates only one order
-- Dialect: PostgreSQL (Supabase)
-- =============================================================================

-- Drop the existing non-unique partial index
DROP INDEX IF EXISTS orders_paymob_accept_order_idx;

-- Create a UNIQUE partial index to prevent duplicate paymob_accept_order_id values
-- This ensures one Paymob transaction cannot update multiple orders
CREATE UNIQUE INDEX orders_paymob_accept_order_unique
  ON orders (paymob_accept_order_id)
  WHERE paymob_accept_order_id IS NOT NULL;
