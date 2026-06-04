-- B2B: طلبات توصيل متعدد العناوين (مرحلة أساسية)
create table if not exists public.corporate_bulk_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  contact_email text not null,
  contact_phone text,
  notes text,
  addresses jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewing', 'quoted', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists corporate_bulk_requests_created_idx
  on public.corporate_bulk_requests (created_at desc);

alter table public.corporate_bulk_requests enable row level security;
