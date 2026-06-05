-- Mr. Brownie Phase 4: A/B prompt variants + Mrs. Cookie admin overlay

-- 1. Persona prompts gain an A/B variant. Drop the old unique(persona,locale)
--    and re-key on (persona, locale, variant).
alter table public.mr_brownie_persona_prompts
  add column if not exists variant text not null default 'a'
    check (variant in ('a', 'b'));

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'mr_brownie_persona_prompts_persona_locale_key'
  ) then
    alter table public.mr_brownie_persona_prompts
      drop constraint mr_brownie_persona_prompts_persona_locale_key;
  end if;
end $$;

create unique index if not exists mr_brownie_persona_prompts_persona_locale_variant_key
  on public.mr_brownie_persona_prompts (persona, locale, variant);

-- 2. Turn logs record which prompt variant produced the reply (for A/B analytics).
alter table public.mr_brownie_turn_logs
  add column if not exists prompt_variant text
    check (prompt_variant is null or prompt_variant in ('a', 'b'));

create index if not exists mr_brownie_turn_logs_variant_idx
  on public.mr_brownie_turn_logs (prompt_variant, created_at desc);

-- 3. Single-row config for the Mrs. Cookie (admin copilot) prompt overlay.
create table if not exists public.mr_brownie_copilot_prompt (
  id            boolean primary key default true check (id),
  overlay       text not null default '' check (char_length(overlay) <= 8000),
  is_published  boolean not null default false,
  updated_at    timestamptz not null default now(),
  updated_by    text
);

comment on table public.mr_brownie_copilot_prompt is
  'Owner/admin-editable system-prompt overlay appended to Mrs. Cookie copilot.';

alter table public.mr_brownie_copilot_prompt enable row level security;
