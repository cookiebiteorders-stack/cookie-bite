-- Recommendation engine: user behavior events (Python blueprint Phase 3)
-- Inserts happen from Next.js /api/events and Python POST /events (service role).

CREATE TABLE IF NOT EXISTS public.user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('view', 'add_to_cart', 'purchase', 'wishlist')
  ),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_product ON public.user_events(product_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON public.user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created ON public.user_events(created_at DESC);

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: server routes use service role only.
