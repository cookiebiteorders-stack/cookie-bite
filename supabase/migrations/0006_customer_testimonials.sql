-- =============================================================================
-- Cookie Bite — Migration 0006: Customer Testimonials
-- =============================================================================

create table if not exists public.customer_testimonials (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  rating     int2 not null check (rating between 1 and 5),
  comment    text not null check (char_length(comment) between 10 and 600),
  status     text not null default 'pending'
             check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_testimonials_user_created_idx
  on public.customer_testimonials (user_id, created_at desc);

create index if not exists customer_testimonials_status_created_idx
  on public.customer_testimonials (status, created_at desc);

create or replace function public.set_customer_testimonials_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_customer_testimonials_updated_at on public.customer_testimonials;
create trigger trg_customer_testimonials_updated_at
before update on public.customer_testimonials
for each row execute function public.set_customer_testimonials_updated_at();

alter table public.customer_testimonials enable row level security;

drop policy if exists "customer testimonials own select" on public.customer_testimonials;
create policy "customer testimonials own select"
  on public.customer_testimonials
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = customer_testimonials.user_id
        and u.clerk_user_id = auth.uid()::text
    )
  );

