-- Mr. Brownie Phase 6: RAG observability + knowledge gap tracking

alter table public.mr_brownie_turn_logs
  add column if not exists rag_source text
    check (rag_source is null or rag_source in ('vector', 'keyword', 'none')),
  add column if not exists rag_hit_count int
    check (rag_hit_count is null or rag_hit_count >= 0);

create index if not exists mr_brownie_turn_logs_rag_idx
  on public.mr_brownie_turn_logs (rag_source, created_at desc);

-- استعلامات لم يُجب عليها RAG — للمراجعة وملء قاعدة المعرفة
create table if not exists public.mr_brownie_knowledge_gaps (
  id                uuid primary key default gen_random_uuid(),
  query_text        text not null check (char_length(query_text) <= 500),
  locale            text,
  occurrence_count  int not null default 1 check (occurrence_count >= 1),
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  resolved          boolean not null default false
);

create unique index if not exists mr_brownie_knowledge_gaps_query_locale_key
  on public.mr_brownie_knowledge_gaps (query_text, coalesce(locale, ''));

comment on table public.mr_brownie_knowledge_gaps is
  'Queries where RAG returned zero snippets — content team can fill gaps.';

alter table public.mr_brownie_knowledge_gaps enable row level security;

-- توسيع أنواع المصدر في chunks ليشمل المنتجات
alter table public.mr_brownie_knowledge_chunks
  drop constraint if exists mr_brownie_knowledge_chunks_source_type_check;

alter table public.mr_brownie_knowledge_chunks
  add constraint mr_brownie_knowledge_chunks_source_type_check
  check (source_type in ('faq', 'policy', 'product'));
