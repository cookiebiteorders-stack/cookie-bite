-- =============================================================================
-- Cookie Bite — Migration 0079: Atomic loyalty point redemption
-- =============================================================================
-- app/api/loyalty/redeem previously did a read-then-write (SELECT total_points,
-- compare in application code, then UPDATE) with no WHERE guard tying the
-- decrement to the balance actually being sufficient. Two concurrent redeem
-- requests could both pass the application-level check before either write
-- landed, letting a user redeem more points than they hold (race condition /
-- TOCTOU). This function performs the check-and-deduct as a single atomic
-- UPDATE ... WHERE total_points >= p_points, which Postgres serializes via
-- row locking — a second concurrent call always sees the already-decremented
-- balance and fails cleanly instead of racing.
-- =============================================================================

create or replace function public.redeem_loyalty_points(p_user_id uuid, p_points integer)
returns table (account_id uuid, remaining_points integer, new_tier public.loyalty_tier)
language plpgsql
as $$
declare
  v_id uuid;
  v_remaining integer;
  v_tier public.loyalty_tier;
begin
  if p_points is null or p_points <= 0 then
    raise exception 'invalid_points';
  end if;

  update public.loyalty_accounts
  set
    total_points = total_points - p_points,
    tier = case
      when (total_points - p_points) >= 1000 then 'cookie_monster'
      when (total_points - p_points) >= 500 then 'cruncher'
      else 'cookie_lover'
    end::public.loyalty_tier
  where user_id = p_user_id
    and total_points >= p_points
  returning id, total_points, tier
  into v_id, v_remaining, v_tier;

  if v_id is null then
    raise exception 'insufficient_points';
  end if;

  return query select v_id, v_remaining, v_tier;
end;
$$;

REVOKE ALL ON FUNCTION public.redeem_loyalty_points(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(uuid, integer) TO service_role;
ALTER FUNCTION public.redeem_loyalty_points(uuid, integer) SET search_path = public;
