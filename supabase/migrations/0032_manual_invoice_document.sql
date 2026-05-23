-- Manual invoices: rich document payload + display number

alter table public.invoices
  add column if not exists invoice_number text,
  add column if not exists due_at timestamptz,
  add column if not exists currency text not null default 'EGP',
  add column if not exists document jsonb not null default '{}'::jsonb,
  add column if not exists created_by uuid references public.users(id) on delete set null;

create unique index if not exists invoices_invoice_number_uidx
  on public.invoices (invoice_number)
  where invoice_number is not null;

create index if not exists invoices_document_gin_idx
  on public.invoices using gin (document);
