-- Mr. Brownie: pgvector RAG for FAQ + policies

create extension if not exists vector;

create table if not exists public.mr_brownie_knowledge_chunks (
  id            uuid primary key default gen_random_uuid(),
  source_type   text not null check (source_type in ('faq', 'policy')),
  source_key    text,
  lang          text,
  chunk_text    text not null check (char_length(chunk_text) <= 4000),
  question      text,
  answer        text,
  metadata      jsonb not null default '{}',
  content_hash  text not null,
  embedding     vector(768),
  updated_at    timestamptz not null default now()
);

create unique index if not exists mr_brownie_knowledge_chunks_hash_key
  on public.mr_brownie_knowledge_chunks (content_hash);

create index if not exists mr_brownie_knowledge_chunks_embedding_idx
  on public.mr_brownie_knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 16);

comment on table public.mr_brownie_knowledge_chunks is
  'Embedded FAQ/policy chunks for Mr. Brownie vector RAG (Gemini text-embedding-004, 768-dim).';

alter table public.mr_brownie_knowledge_chunks enable row level security;

create or replace function public.match_mr_brownie_knowledge(
  query_embedding vector(768),
  match_count     int default 5,
  match_threshold float default 0.52,
  filter_lang     text default null
)
returns table (
  id            uuid,
  source_type   text,
  chunk_text    text,
  question      text,
  answer        text,
  lang          text,
  similarity    float
)
language sql
stable
as $$
  select
    k.id,
    k.source_type,
    k.chunk_text,
    k.question,
    k.answer,
    k.lang,
    (1 - (k.embedding <=> query_embedding))::float as similarity
  from public.mr_brownie_knowledge_chunks k
  where k.embedding is not null
    and (
      filter_lang is null
      or k.lang is null
      or k.lang = filter_lang
    )
    and (1 - (k.embedding <=> query_embedding)) > match_threshold
  order by k.embedding <=> query_embedding
  limit greatest(1, least(match_count, 12));
$$;
