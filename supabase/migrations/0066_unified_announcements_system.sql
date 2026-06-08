-- =============================================================================
-- Cookie Bite — Unified announcement & notification system
-- =============================================================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('banner', 'popup', 'notification', 'inline', 'system')),
  title_en text not null default '',
  title_ar text not null default '',
  message_en text not null default '',
  message_ar text not null default '',
  cta_label_en text,
  cta_label_ar text,
  cta_url text,
  priority int not null default 50,
  status text not null default 'draft'
    check (status in ('active', 'scheduled', 'expired', 'draft')),
  start_at timestamptz,
  end_at timestamptz,
  target_pages text[] not null default array['all'],
  audience jsonb not null default '{"userType":"all"}'::jsonb,
  trigger_config jsonb not null default '{"type":"immediate"}'::jsonb,
  frequency jsonb not null default '{"perSession":true,"cooldownHours":24}'::jsonb,
  dismissible boolean not null default true,
  variant text check (variant is null or variant in ('success', 'warning', 'error', 'info')),
  design jsonb not null default '{}'::jsonb,
  ab_test jsonb,
  metrics jsonb not null default '{"impressions":0,"clicks":0,"dismissals":0}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users (id) on delete set null
);

create index if not exists announcements_status_priority_idx
  on public.announcements (status, priority desc, start_at);

create index if not exists announcements_type_idx
  on public.announcements (type);

create table if not exists public.announcement_user_state (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  seen_at timestamptz,
  dismissed_at timestamptz,
  clicked_at timestamptz,
  impression_count int not null default 0,
  updated_at timestamptz not null default now(),
  unique (announcement_id, user_id)
);

create index if not exists announcement_user_state_user_idx
  on public.announcement_user_state (user_id);

create table if not exists public.announcement_events (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'click', 'dismiss', 'conversion')),
  user_id uuid references public.users (id) on delete set null,
  session_id text,
  page text,
  variant_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists announcement_events_announcement_idx
  on public.announcement_events (announcement_id, created_at desc);

-- Seed starter announcements
insert into public.announcements (
  type, title_en, title_ar, message_en, message_ar,
  cta_label_en, cta_label_ar, cta_url,
  priority, status, target_pages, audience, trigger_config, variant
)
values
  (
    'banner',
    'Free delivery',
    'توصيل مجاني',
    'Free delivery on orders over 500 EGP in New Cairo',
    'توصيل مجاني للطلبات فوق 500 جنيه في التجمع الخامس',
    'Shop now',
    'تسوق الآن',
    '/shop',
    80,
    'active',
    array['all'],
    '{"userType":"all"}'::jsonb,
    '{"type":"immediate"}'::jsonb,
    null
  ),
  (
    'notification',
    'Welcome back',
    'أهلاً بعودتك',
    'Check what''s new this week — fresh bakes & gift boxes',
    'اطّلع على الجديد هذا الأسبوع — مخبوزات طازجة وعلب هدايا',
    'View updates',
    'عرض التحديثات',
    '/updates',
    60,
    'active',
    array['home', 'shop', 'all'],
    '{"userType":"logged_in"}'::jsonb,
    '{"type":"immediate"}'::jsonb,
    null
  ),
  (
    'popup',
    'Gift season',
    'موسم الهدايا',
    'Build a custom gift box — perfect for birthdays & corporate treats',
    'صمّم علبة هدايا مخصصة — مثالية للأعياد والشركات',
    'Start building',
    'ابدأ التصميم',
    '/gift-box',
    70,
    'active',
    array['home', 'product'],
    '{"userType":"all"}'::jsonb,
    '{"type":"delay","value":5}'::jsonb,
    null
  ),
  (
    'inline',
    'Cart perk',
    'ميزة السلة',
    'You''re close to free delivery — add a little more!',
    'أنت قريب من التوصيل المجاني — أضف القليل!',
    null,
    null,
    null,
    55,
    'active',
    array['cart'],
    '{"userType":"all"}'::jsonb,
    '{"type":"immediate"}'::jsonb,
    'info'
  );

alter table public.announcements enable row level security;
alter table public.announcement_user_state enable row level security;
alter table public.announcement_events enable row level security;

drop policy if exists "announcements service only" on public.announcements;
create policy "announcements service only"
  on public.announcements for all using (false) with check (false);

drop policy if exists "announcement_user_state service only" on public.announcement_user_state;
create policy "announcement_user_state service only"
  on public.announcement_user_state for all using (false) with check (false);

drop policy if exists "announcement_events service only" on public.announcement_events;
create policy "announcement_events service only"
  on public.announcement_events for all using (false) with check (false);

notify pgrst, 'reload schema';
