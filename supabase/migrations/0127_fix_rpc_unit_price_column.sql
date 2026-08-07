-- =============================================================================
-- Cookie Bite — Migration 0127: Fix RPC function unit_price column
-- =============================================================================
-- This migration fixes the RPC function to include the unit_price column
-- which was causing a NOT NULL constraint violation
-- =============================================================================

-- This migration is a backup for the fix applied via Supabase MCP
-- The actual fix was applied: fix_rpc_unit_price_column
