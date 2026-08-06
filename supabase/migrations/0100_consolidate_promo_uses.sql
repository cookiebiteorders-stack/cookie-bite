-- =============================================================================
-- Cookie Bite — Migration 0100: Consolidate promo_uses tables (DB-08)
-- Purpose: Consolidate promo_uses and promo_code_uses into a single canonical table
-- =============================================================================

-- Check if promo_uses table exists and migrate data to promo_code_uses
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promo_uses' AND table_schema = 'public') THEN
    -- Migrate data from promo_uses to promo_code_uses
    INSERT INTO public.promo_code_uses (promo_code_id, user_id, order_id, used_at)
    SELECT 
      pu.promo_id as promo_code_id,
      pu.user_id,
      pu.order_id,
      pu.used_at
    FROM public.promo_uses pu
    ON CONFLICT DO NOTHING;
    
    -- Drop the old promo_uses table
    DROP TABLE IF EXISTS public.promo_uses;
  END IF;
END $$;

-- Add comment to clarify promo_code_uses is the canonical table
COMMENT ON TABLE public.promo_code_uses IS
'Canonical table for tracking promo code usage. Consolidated from promo_uses (DB-08).';

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS promo_code_uses_user_idx ON public.promo_code_uses (user_id);
CREATE INDEX IF NOT EXISTS promo_code_uses_promo_idx ON public.promo_code_uses (promo_code_id);
CREATE INDEX IF NOT EXISTS promo_code_uses_order_idx ON public.promo_code_uses (order_id);
