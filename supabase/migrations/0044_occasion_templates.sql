-- Feature 8: ready-made occasion templates for gift box builder

create table if not exists public.occasion_templates (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  occasion_type text not null,
  emoji text,
  description_ar text,
  description_en text,
  suggested_products jsonb not null default '[]'::jsonb,
  suggested_addons jsonb not null default '[]'::jsonb,
  suggested_message_ar text,
  suggested_message_en text,
  suggested_box_code text,
  ribbon_color text default 'gold',
  wrap_style text default 'kraft',
  card_design text default 'birthday',
  cover_image text,
  sort_order int not null default 0,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_occasion_templates_active on public.occasion_templates (sort_order)
  where is_active = true;

alter table public.occasion_templates enable row level security;

drop policy if exists occasion_templates_public_read on public.occasion_templates;
create policy occasion_templates_public_read on public.occasion_templates
  for select using (is_active = true);

insert into public.occasion_templates (
  name_ar,
  name_en,
  occasion_type,
  emoji,
  suggested_message_ar,
  suggested_message_en,
  suggested_box_code,
  card_design,
  sort_order,
  is_featured
) values
  (
    'عيد ميلاد سعيد',
    'Happy Birthday',
    'birthday',
    '🎂',
    'كل عام وأنت بخير، أتمنى لك يوماً مليئاً بالفرحة والحلوى!',
    'Happy birthday — wishing you a day full of joy and treats!',
    'medium',
    'birthday',
    10,
    true
  ),
  (
    'رمضان كريم',
    'Ramadan Kareem',
    'ramadan',
    '🌙',
    'رمضان كريم، تقبّل الله طاعتكم',
    'Ramadan Kareem — may your fasts be accepted',
    'medium',
    'birthday',
    20,
    true
  ),
  (
    'شكراً من القلب',
    'Thank You',
    'thanks',
    '🙏',
    'شكراً على كل شيء، هذه الهدية تعبير بسيط عن امتناني',
    'Thank you — this gift is a small token of my appreciation',
    'small',
    'birthday',
    30,
    false
  ),
  (
    'مبروك الزواج',
    'Wedding Wishes',
    'wedding',
    '💍',
    'بالرفاء والبنين، مبروك على هذا اليوم الجميل',
    'Congratulations on your beautiful day together',
    'large',
    'birthday',
    40,
    true
  ),
  (
    'هدية الشركة',
    'Corporate Gift',
    'corporate',
    '🏢',
    'بمناسبة تعاوننا المثمر، نتمنى لكم دوام النجاح',
    'With appreciation for our partnership — wishing you continued success',
    'large',
    'birthday',
    50,
    false
  ),
  (
    'العودة للمدرسة',
    'Back to School',
    'back_to_school',
    '📚',
    'عاماً دراسياً موفقاً، أنت نجم!',
    'Have a wonderful school year — you are a star!',
    'small',
    'birthday',
    60,
    false
  );
