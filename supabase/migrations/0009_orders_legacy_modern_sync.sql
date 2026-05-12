-- =============================================================================
-- Cookie Bite — Migration 0009: orders legacy/modern column synchronization
-- الهدف: منع drift بين أعمدة orders القديمة والجديدة أثناء فترة الانتقال.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Backfill ثنائي الاتجاه (قيم حالية)
-- -----------------------------------------------------------------------------
update public.orders
set
  subtotal_egp = coalesce(subtotal_egp, subtotal),
  delivery_fee_egp = coalesce(delivery_fee_egp, delivery_fee),
  total_egp = coalesce(total_egp, total),
  guest_email = coalesce(guest_email, nullif(email, '')),
  shipping_address = coalesce(shipping_address, address)
where
  subtotal_egp is null
  or delivery_fee_egp is null
  or total_egp is null
  or guest_email is null
  or shipping_address is null;

update public.orders
set
  subtotal = coalesce(subtotal, subtotal_egp),
  delivery_fee = coalesce(delivery_fee, delivery_fee_egp),
  total = coalesce(total, total_egp),
  email = coalesce(nullif(email, ''), guest_email),
  address = coalesce(address, shipping_address)
where
  subtotal is null
  or delivery_fee is null
  or total is null
  or email is null
  or address is null;

-- -----------------------------------------------------------------------------
-- 2) Trigger مزامنة الأعمدة قبل INSERT/UPDATE
-- -----------------------------------------------------------------------------
create or replace function public.tg_orders_sync_legacy_modern()
returns trigger
language plpgsql
as $$
begin
  -- monetary
  new.subtotal_egp := coalesce(new.subtotal_egp, new.subtotal);
  new.subtotal := coalesce(new.subtotal, new.subtotal_egp);

  new.delivery_fee_egp := coalesce(new.delivery_fee_egp, new.delivery_fee, 0);
  new.delivery_fee := coalesce(new.delivery_fee, new.delivery_fee_egp, 0);

  new.total_egp := coalesce(new.total_egp, new.total);
  new.total := coalesce(new.total, new.total_egp);

  -- contact/address
  new.guest_email := coalesce(new.guest_email, nullif(new.email, ''));
  new.email := coalesce(nullif(new.email, ''), new.guest_email, '');

  new.shipping_address := coalesce(new.shipping_address, new.address);
  new.address := coalesce(new.address, new.shipping_address, '{}'::jsonb);

  -- normalization defaults
  new.language := coalesce(new.language, 'ar');
  new.discount_amount_egp := coalesce(new.discount_amount_egp, 0);
  new.gift_wrapping_fee_egp := coalesce(new.gift_wrapping_fee_egp, 0);
  new.is_gift := coalesce(new.is_gift, false);
  new.whatsapp_confirmed := coalesce(new.whatsapp_confirmed, false);
  new.currency := coalesce(new.currency, 'EGP');

  -- derive modern total if old total was omitted but parts present
  if new.total_egp is null and new.subtotal_egp is not null then
    new.total_egp := greatest(
      0,
      new.subtotal_egp
      - coalesce(new.discount_amount_egp, 0)
      + coalesce(new.delivery_fee_egp, 0)
      + coalesce(new.gift_wrapping_fee_egp, 0)
    );
    new.total := coalesce(new.total, new.total_egp);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orders_sync_legacy_modern on public.orders;
create trigger trg_orders_sync_legacy_modern
before insert or update on public.orders
for each row
execute function public.tg_orders_sync_legacy_modern();

-- -----------------------------------------------------------------------------
-- 3) فهارس داعمة للأعمدة الحديثة المستخدمة في API
-- -----------------------------------------------------------------------------
create index if not exists orders_total_egp_idx on public.orders (total_egp);
create index if not exists orders_language_idx on public.orders (language);
create index if not exists orders_guest_email_lower_idx on public.orders (lower(guest_email))
  where guest_email is not null;

-- =============================================================================
-- End 0009_orders_legacy_modern_sync.sql
-- =============================================================================
