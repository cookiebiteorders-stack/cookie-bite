-- =============================================================================
-- Cookie Bite — Migration 0071: Security hardening (Supabase Security Advisor)
-- يعالج: جداول بدون RLS، سياسات مفرطة، دوال RPC خطرة، RLS بدون policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) P0: جداول كانت بدون RLS نهائياً
-- ---------------------------------------------------------------------------
ALTER TABLE public.gift_box_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gift_box_sizes public read active" ON public.gift_box_sizes;
CREATE POLICY "gift_box_sizes public read active"
  ON public.gift_box_sizes FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "gift_box_sizes service role all" ON public.gift_box_sizes;
CREATE POLICY "gift_box_sizes service role all"
  ON public.gift_box_sizes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "delivery_time_slots service role all" ON public.delivery_time_slots;
CREATE POLICY "delivery_time_slots service role all"
  ON public.delivery_time_slots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "slot_bookings service role all" ON public.slot_bookings;
CREATE POLICY "slot_bookings service role all"
  ON public.slot_bookings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 2) P0: إزالة قراءة عامة لكل صناديق الهدايا النشطة (التطبيق يستخدم service-role API)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "gift_boxes public read active by token" ON public.gift_boxes;

-- ---------------------------------------------------------------------------
-- 3) P1: إضافات المنتج — service role فقط
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['addons', 'product_addons', 'addon_categories'] LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s service role all" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s service role all" ON public.%I FOR ALL
       USING (auth.role() = ''service_role'')
       WITH CHECK (auth.role() = ''service_role'')',
      t, t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4) P1: سياسات service-role صريحة لجداول حساسة (RLS مفعّل بدون policies)
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customer_admin_notes', 'admin_presence_sessions', 'user_events',
    'corporate_bulk_requests', 'abandoned_carts', 'recovery_discount_codes',
    'users', 'addresses', 'orders', 'order_items', 'contact_messages', 'newsletter_subscribers',
    'promo_code_uses', 'loyalty_accounts', 'loyalty_transactions',
    'product_categories', 'product_tags', 'product_tag_links',
    'product_collections', 'product_collection_items', 'product_variants',
    'product_catalog_settings', 'product_versions',
    'mr_brownie_chat_messages', 'mr_brownie_turn_logs',
    'mr_brownie_persona_prompts', 'mr_brownie_user_tone',
    'mr_brownie_training_examples', 'mr_brownie_feedback',
    'mr_brownie_knowledge_chunks', 'mr_brownie_copilot_prompt', 'mr_brownie_knowledge_gaps',
    'tracking_visitors', 'tracking_sessions', 'tracking_events',
    'tracking_page_views', 'tracking_click_events', 'tracking_scroll_events',
    'tracking_utm_campaigns', 'tracking_realtime_users', 'tracking_funnels',
    'tracking_conversions', 'tracking_heatmaps', 'tracking_recordings'
  ] LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS "%s service role all" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s service role all" ON public.%I FOR ALL
       USING (auth.role() = ''service_role'')
       WITH CHECK (auth.role() = ''service_role'')',
      t, t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "audit_logs service role all" ON public.audit_logs;
CREATE POLICY "audit_logs service role all"
  ON public.audit_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "order_lifecycle_events service role all" ON public.order_lifecycle_events;
CREATE POLICY "order_lifecycle_events service role all"
  ON public.order_lifecycle_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5) P1: تشديد سياسات عامة مفرطة
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "shipping_zones public read" ON public.shipping_zones;
CREATE POLICY "shipping_zones public read"
  ON public.shipping_zones FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "anyone inserts helpful vote" ON public.review_helpful_votes;
-- التصويت فقط عبر register_review_helpful_vote() (security definer)

-- ---------------------------------------------------------------------------
-- 6) P0/P2: قفل دوال RPC الخطرة + تثبيت search_path
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS func
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'decrement_product_stock',
        'add_loyalty_points',
        'match_mr_brownie_knowledge'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.func);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.func);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.func);
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS func
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'set_updated_at',
        'tg_set_updated_at',
        'set_order_code',
        'update_product_search_vector',
        'tg_orders_sync_legacy_modern',
        'set_customer_testimonials_updated_at'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.func);
  END LOOP;
END $$;

-- register_review_helpful_vote يبقى متاحاً لـ anon عبر RPC آمن (security definer)
GRANT EXECUTE ON FUNCTION public.register_review_helpful_vote(uuid, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7) P2: إعادة تطبيق حماية auth.users (من 0024)
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT v.view_schema AS sch, v.view_name AS rel
    FROM information_schema.view_table_usage v
    WHERE v.table_schema = 'auth'
      AND v.table_name = 'users'
      AND v.view_schema IN ('public', 'graphql_public')
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM anon, authenticated, PUBLIC',
      r.sch, r.rel
    );
  END LOOP;

  FOR r IN
    SELECT m.schemaname AS sch, m.matviewname AS rel
    FROM pg_matviews m
    WHERE m.schemaname IN ('public', 'graphql_public')
      AND m.definition ILIKE '%auth.users%'
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM anon, authenticated, PUBLIC',
      r.sch, r.rel
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
