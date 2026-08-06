-- =============================================================================
-- Cookie Bite — Migration 0098: Add provider_transaction_id to payments (PAY-02)
-- Purpose: Track Paymob transaction IDs in the payment ledger for idempotency
-- Dialect: PostgreSQL (Supabase)
-- =============================================================================

-- Add provider_transaction_id column to payments table
ALTER TABLE payments 
ADD COLUMN provider_transaction_id text;

-- Create unique index on provider_transaction_id to prevent duplicate payments
CREATE UNIQUE INDEX payments_provider_tx_unique
  ON payments (provider_transaction_id) 
  WHERE provider_transaction_id IS NOT NULL;
