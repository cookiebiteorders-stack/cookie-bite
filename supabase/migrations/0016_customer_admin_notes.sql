-- Internal CRM notes per customer (admin-only via service role API).

CREATE TABLE IF NOT EXISTS public.customer_admin_notes (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_email text
);

CREATE INDEX IF NOT EXISTS idx_customer_admin_notes_updated_at ON public.customer_admin_notes(updated_at DESC);

ALTER TABLE public.customer_admin_notes ENABLE ROW LEVEL SECURITY;
