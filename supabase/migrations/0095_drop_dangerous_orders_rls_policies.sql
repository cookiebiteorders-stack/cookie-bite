-- =============================================================================
-- Cookie Bite — Migration 0095: Drop dangerous orders RLS policies (SEC-01)
-- Purpose: Fix critical security vulnerability where customers can UPDATE/DELETE
-- their own orders including payment_status, enabling payment tampering
-- =============================================================================

-- DROP the dangerous "orders update own" policy
-- This policy allows authenticated users to mutate any column on their own orders
-- including payment_status, total_egp, and status, which bypasses the entire Paymob flow
DROP POLICY IF EXISTS "orders update own" ON public.orders;

-- DROP the dangerous "orders delete own" policy
-- This policy allows authenticated users to delete their own orders
-- breaking reconciliation and stock-release auditing
DROP POLICY IF EXISTS "orders delete own" ON public.orders;

-- Note: All order writes should go through the service role via API routes
-- If self-service cancellation is needed in the future, implement it as a
-- SECURITY DEFINER RPC that only flips status='cancelled' when payment_status='unpaid'
