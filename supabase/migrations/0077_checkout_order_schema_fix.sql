-- =============================================================================
-- Cookie Bite — Migration 0077: Checkout order schema alignment
-- Ensures orders + order_items match the production checkout flow.
-- Fixes: missing product_name, unit_price_egp, total_price_egp on order_items
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) orders — customer + financial columns used at checkout
-- -----------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EGP',
  ADD COLUMN IF NOT EXISTS subtotal_egp numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee_egp numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount_egp numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_egp numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paymob_accept_order_id bigint,
  ADD COLUMN IF NOT EXISTS paymob_transaction_id text,
  ADD COLUMN IF NOT EXISTS shipping_address jsonb,
  ADD COLUMN IF NOT EXISTS order_code text,
  ADD COLUMN IF NOT EXISTS checkout_idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_idempotency_key_unique_idx
  ON public.orders (checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_paymob_accept_order_idx
  ON public.orders (paymob_accept_order_id)
  WHERE paymob_accept_order_id IS NOT NULL;

COMMENT ON COLUMN public.orders.paymob_accept_order_id IS
  'Paymob intention / accept order id (maps to paymob_order_id in integrations docs)';

-- -----------------------------------------------------------------------------
-- 2) order_items — canonical e-commerce line-item structure
-- -----------------------------------------------------------------------------
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS unit_price_egp numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_price_egp numeric(10,2),
  ADD COLUMN IF NOT EXISTS product_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS selected_addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS addons_total_egp numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_total_egp numeric(10,2),
  ADD COLUMN IF NOT EXISTS variant_id uuid,
  ADD COLUMN IF NOT EXISTS variant_snapshot jsonb;

DO $$
BEGIN
  IF to_regclass('public.product_variants') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'order_items_variant_id_fkey'
         AND conrelid = 'public.order_items'::regclass
     ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_variant_id_fkey
      FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill product_name from legacy/drifted column shapes
UPDATE public.order_items oi
SET product_name = COALESCE(
  nullif(trim(oi.product_name), ''),
  nullif(trim(oi.product_snapshot->>'name'), ''),
  nullif(trim(oi.product_snapshot->>'title'), ''),
  CASE
    WHEN oi.product_snapshot ? 'snapshot'
      AND jsonb_typeof(oi.product_snapshot->'snapshot') = 'object'
    THEN nullif(trim(oi.product_snapshot->'snapshot'->>'name_en'), '')
    ELSE NULL
  END,
  CASE
    WHEN to_jsonb(oi) ? 'name' AND jsonb_typeof(to_jsonb(oi)->'name') = 'string'
    THEN nullif(trim(to_jsonb(oi)->>'name'), '')
    ELSE NULL
  END,
  CASE
    WHEN to_jsonb(oi) ? 'name' AND jsonb_typeof(to_jsonb(oi)->'name') = 'object'
    THEN COALESCE(
      nullif(trim(to_jsonb(oi)->'name'->>'en'), ''),
      nullif(trim(to_jsonb(oi)->'name'->>'ar'), '')
    )
    ELSE NULL
  END,
  'Unknown item'
)
WHERE oi.product_name IS NULL OR trim(oi.product_name) = '';

-- Backfill unit_price_egp / total_price_egp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'unit_price'
  ) THEN
    EXECUTE $sql$
      UPDATE public.order_items
      SET unit_price_egp = COALESCE(unit_price_egp, unit_price::numeric(10,2))
      WHERE unit_price_egp IS NULL
    $sql$;
  END IF;
END $$;

UPDATE public.order_items
SET unit_price_egp = COALESCE(unit_price_egp, 0)
WHERE unit_price_egp IS NULL;

UPDATE public.order_items
SET total_price_egp = COALESCE(
  total_price_egp,
  final_total_egp,
  unit_price_egp * quantity,
  0
)
WHERE total_price_egp IS NULL;

UPDATE public.order_items
SET final_total_egp = COALESCE(final_total_egp, total_price_egp)
WHERE final_total_egp IS NULL;

ALTER TABLE public.order_items
  ALTER COLUMN product_name SET NOT NULL,
  ALTER COLUMN unit_price_egp SET NOT NULL,
  ALTER COLUMN quantity SET NOT NULL;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_unit_price_egp_nonneg;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_unit_price_egp_nonneg
  CHECK (unit_price_egp >= 0);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON public.order_items (product_id)
  WHERE product_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3) Trigger — keep product_name + totals consistent on insert/update
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_order_items_normalize()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  snap jsonb;
BEGIN
  snap := COALESCE(NEW.product_snapshot, '{}'::jsonb);

  IF NEW.product_name IS NULL OR trim(NEW.product_name) = '' THEN
    NEW.product_name := COALESCE(
      nullif(trim(snap->>'name'), ''),
      nullif(trim(snap->>'title'), ''),
      'Unknown item'
    );
  END IF;

  NEW.unit_price_egp := COALESCE(NEW.unit_price_egp, 0);
  NEW.quantity := COALESCE(NEW.quantity, 1);

  NEW.total_price_egp := COALESCE(
    NEW.total_price_egp,
    NEW.final_total_egp,
    NEW.unit_price_egp * NEW.quantity
  );

  NEW.final_total_egp := COALESCE(NEW.final_total_egp, NEW.total_price_egp);
  NEW.selected_addons := COALESCE(NEW.selected_addons, '[]'::jsonb);
  NEW.addons_total_egp := COALESCE(NEW.addons_total_egp, 0);

  IF NEW.product_snapshot IS NULL THEN
    NEW.product_snapshot := jsonb_build_object(
      'name', NEW.product_name,
      'unit_price_egp', NEW.unit_price_egp
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_normalize ON public.order_items;
CREATE TRIGGER trg_order_items_normalize
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_order_items_normalize();

-- -----------------------------------------------------------------------------
-- 4) RLS — service role writes (checkout uses service key server-side)
-- -----------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders service role all" ON public.orders;
CREATE POLICY "orders service role all"
  ON public.orders FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "order_items service role all" ON public.order_items;
CREATE POLICY "order_items service role all"
  ON public.order_items FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';
