-- Reviews: optional photo + helpful votes
alter table public.reviews
  add column if not exists photo_url text,
  add column if not exists helpful_count integer not null default 0;

alter table public.reviews
  drop constraint if exists reviews_helpful_count_nonneg;

alter table public.reviews
  add constraint reviews_helpful_count_nonneg check (helpful_count >= 0);

create table if not exists public.review_helpful_votes (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references public.reviews(id) on delete cascade,
  voter_key   text not null,
  created_at  timestamptz not null default now(),
  unique (review_id, voter_key)
);

create index if not exists review_helpful_votes_review_idx
  on public.review_helpful_votes (review_id);

alter table public.review_helpful_votes enable row level security;

drop policy if exists "anyone inserts helpful vote" on public.review_helpful_votes;
create policy "anyone inserts helpful vote"
  on public.review_helpful_votes for insert
  with check (true);

drop policy if exists "no public read helpful votes" on public.review_helpful_votes;
create policy "no public read helpful votes"
  on public.review_helpful_votes for select
  using (false);

create or replace function public.register_review_helpful_vote(
  p_review_id uuid,
  p_voter_key text
)
returns table (helpful_count integer, already_voted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_voter_key is null or length(trim(p_voter_key)) < 8 then
    raise exception 'invalid voter key';
  end if;

  if not exists (
    select 1 from public.reviews
    where id = p_review_id and is_approved = true
  ) then
    raise exception 'review not found';
  end if;

  begin
    insert into public.review_helpful_votes (review_id, voter_key)
    values (p_review_id, p_voter_key);
  exception when unique_violation then
    select r.helpful_count into v_count
    from public.reviews r where r.id = p_review_id;
    return query select coalesce(v_count, 0), true;
    return;
  end;

  update public.reviews
  set helpful_count = helpful_count + 1
  where id = p_review_id
  returning reviews.helpful_count into v_count;

  return query select coalesce(v_count, 0), false;
end;
$$;

grant execute on function public.register_review_helpful_vote(uuid, text) to anon, authenticated;
