-- Full website tracking system.
-- Tables: tracking_visitors, tracking_sessions, tracking_events,
--         tracking_page_views, tracking_click_events, tracking_scroll_events,
--         tracking_utm_campaigns, tracking_realtime_users, tracking_funnels,
--         tracking_conversions, tracking_heatmaps, tracking_recordings.
--
-- All write paths go through Next.js /api/track using the service-role key;
-- RLS is therefore enabled but no public policies are added. Admin reads go
-- through /api/analytics/* which also uses the service-role key.

------------------------------------------------------------
-- 1. Visitors
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  fingerprint TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_referrer TEXT,
  first_utm JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_type TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  os_version TEXT,
  language TEXT,
  timezone TEXT,
  screen_width INT,
  screen_height INT,
  country TEXT,
  city TEXT,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  total_sessions INT NOT NULL DEFAULT 0,
  total_events INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tracking_visitors_user ON public.tracking_visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_visitors_last_seen
  ON public.tracking_visitors(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_visitors_device_type
  ON public.tracking_visitors(device_type);

------------------------------------------------------------
-- 2. Sessions
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  entry_page TEXT,
  exit_page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  ip INET,
  pageview_count INT NOT NULL DEFAULT 0,
  click_count INT NOT NULL DEFAULT 0,
  event_count INT NOT NULL DEFAULT 0,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  is_bounce BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_visitor
  ON public.tracking_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_user
  ON public.tracking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_started
  ON public.tracking_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_utm
  ON public.tracking_sessions(utm_source, utm_medium, utm_campaign);

------------------------------------------------------------
-- 3. Events (catch-all)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  path TEXT,
  url TEXT,
  title TEXT,
  referrer TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  ip INET
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_session
  ON public.tracking_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_visitor
  ON public.tracking_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_user
  ON public.tracking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_name_time
  ON public.tracking_events(name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_events_path
  ON public.tracking_events(path);
CREATE INDEX IF NOT EXISTS idx_tracking_events_occurred
  ON public.tracking_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_events_properties
  ON public.tracking_events USING GIN (properties jsonb_path_ops);

------------------------------------------------------------
-- 4. Page views (denormalised for fast pages report)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_page_views (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT UNIQUE,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT,
  referrer TEXT,
  device_type TEXT,
  country TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INT
);

CREATE INDEX IF NOT EXISTS idx_tracking_page_views_path_time
  ON public.tracking_page_views(path, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_page_views_session
  ON public.tracking_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_page_views_occurred
  ON public.tracking_page_views(occurred_at DESC);

------------------------------------------------------------
-- 5. Click events
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_click_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT UNIQUE,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  selector TEXT,
  element_tag TEXT,
  element_text TEXT,
  href TEXT,
  x INT,
  y INT,
  page_x INT,
  page_y INT,
  viewport_width INT,
  viewport_height INT,
  is_rage BOOLEAN NOT NULL DEFAULT FALSE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_click_events_path
  ON public.tracking_click_events(path, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_click_events_session
  ON public.tracking_click_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_click_events_rage
  ON public.tracking_click_events(is_rage) WHERE is_rage = TRUE;

------------------------------------------------------------
-- 6. Scroll events
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_scroll_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT UNIQUE,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  depth INT NOT NULL,
  max_pct INT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_scroll_events_path
  ON public.tracking_scroll_events(path, occurred_at DESC);

------------------------------------------------------------
-- 7. UTM campaigns (rollups, optional)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_utm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utm_source TEXT NOT NULL,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sessions INT NOT NULL DEFAULT 0,
  visitors INT NOT NULL DEFAULT 0,
  conversions INT NOT NULL DEFAULT 0,
  UNIQUE (utm_source, utm_medium, utm_campaign, utm_term, utm_content)
);

------------------------------------------------------------
-- 8. Realtime users (volatile cache, also mirrored to Redis)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_realtime_users (
  visitor_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  path TEXT,
  country TEXT,
  device_type TEXT
);

CREATE INDEX IF NOT EXISTS idx_tracking_realtime_users_last_event
  ON public.tracking_realtime_users(last_event_at DESC);

------------------------------------------------------------
-- 9. Funnels
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  /* steps: ordered array of {name, event, match: {path?, properties?}} */
  steps JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

------------------------------------------------------------
-- 10. Conversions (audit log of completed funnels/goals)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_conversions (
  id BIGSERIAL PRIMARY KEY,
  funnel_id UUID REFERENCES public.tracking_funnels(id) ON DELETE SET NULL,
  goal TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  value NUMERIC(12, 2),
  currency TEXT,
  step INT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tracking_conversions_funnel
  ON public.tracking_conversions(funnel_id, occurred_at DESC);

------------------------------------------------------------
-- 11. Heatmaps (pre-aggregated grid buckets)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_heatmaps (
  id BIGSERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  device_type TEXT NOT NULL,
  bucket_x INT NOT NULL,
  bucket_y INT NOT NULL,
  clicks INT NOT NULL DEFAULT 0,
  rage_clicks INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (path, device_type, bucket_x, bucket_y)
);

CREATE INDEX IF NOT EXISTS idx_tracking_heatmaps_path
  ON public.tracking_heatmaps(path, device_type);

------------------------------------------------------------
-- 12. Session recordings (compressed event stream)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INT,
  /* events: array of {t, type, x?, y?, path?, value?} kept small */
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  size_bytes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_recordings_session
  ON public.tracking_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_recordings_started
  ON public.tracking_recordings(started_at DESC);

------------------------------------------------------------
-- 13. RLS — service-role only writes/reads
------------------------------------------------------------
ALTER TABLE public.tracking_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_scroll_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_utm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_realtime_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_heatmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_recordings ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- 14. Seed: a default e-commerce funnel
------------------------------------------------------------
INSERT INTO public.tracking_funnels (slug, name, description, steps)
VALUES (
  'ecommerce_default',
  'E-commerce conversion funnel',
  'Default home → product → cart → checkout → purchase funnel.',
  '[
    {"name": "Home view",      "event": "page_view",       "match": {"path": "/"}},
    {"name": "Product view",   "event": "view_item"},
    {"name": "Add to cart",    "event": "add_to_cart"},
    {"name": "Begin checkout", "event": "begin_checkout"},
    {"name": "Purchase",       "event": "purchase"}
  ]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
