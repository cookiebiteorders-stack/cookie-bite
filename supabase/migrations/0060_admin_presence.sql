-- Live admin / owner / staff presence in the admin console.
-- Heartbeats come from /api/admin/presence (service-role writes only).

CREATE TABLE IF NOT EXISTS public.admin_presence_sessions (
  clerk_user_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
  current_path TEXT,
  current_module TEXT,
  last_action TEXT,
  ip TEXT,
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_presence_last_seen
  ON public.admin_presence_sessions(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_presence_role
  ON public.admin_presence_sessions(role);

ALTER TABLE public.admin_presence_sessions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.admin_presence_sessions IS
  'Ephemeral staff presence rows updated by /api/admin/presence heartbeats.';
