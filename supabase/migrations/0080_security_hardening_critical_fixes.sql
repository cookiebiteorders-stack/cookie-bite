-- =============================================================================
-- Cookie Bite — Migration 0080: Security Hardening Critical Fixes
-- Purpose: Fix critical security vulnerabilities identified in security audit
-- =============================================================================

-- =============================================================================
-- CRITICAL FIX 1: Payments table security hardening
-- Risk: Overly permissive policy allows admin/owner to bypass all payment RLS
-- =============================================================================
DROP POLICY IF EXISTS "payments service role all" ON public.payments;

-- Replace with more restrictive policy - only service role can bypass RLS
CREATE POLICY "payments service role all" ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add policy for users to read their own payment data through orders
CREATE POLICY "payments users read own" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id AND o.user_id = auth.uid()
    )
  );

-- =============================================================================
-- CRITICAL FIX 2: Discounts table security hardening
-- Risk: Anyone (including anonymous) can read all discount data
-- =============================================================================
DROP POLICY IF EXISTS "discounts: read all" ON public.discounts;

-- Replace with policy that only allows reading active discounts
CREATE POLICY "discounts read active" ON public.discounts
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Keep admin policy for full access
DROP POLICY IF EXISTS "discounts: read admins" ON public.discounts;
CREATE POLICY "discounts: read admins" ON public.discounts
  FOR SELECT
  TO authenticated
  USING (is_admin_or_owner());

DROP POLICY IF EXISTS "discounts: write admins" ON public.discounts;
CREATE POLICY "discounts: write admins" ON public.discounts
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

-- =============================================================================
-- CRITICAL FIX 3: Promo codes security hardening
-- Risk: Anonymous users can read promo codes enabling coupon abuse
-- =============================================================================
DROP POLICY IF EXISTS "anyone reads active promos" ON public.promo_codes;

-- Replace with authenticated-only policy
CREATE POLICY "promo codes read active" ON public.promo_codes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Add admin policy for full access
DROP POLICY IF EXISTS "promo codes admins all" ON public.promo_codes;
CREATE POLICY "promo codes admins all" ON public.promo_codes
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

-- =============================================================================
-- HIGH FIX 4: Orders table - add delete policy for users
-- Risk: Users cannot delete their own orders (needed for abandoned carts)
-- =============================================================================
DROP POLICY IF EXISTS "orders delete own" ON public.orders;
CREATE POLICY "orders delete own" ON public.orders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- =============================================================================
-- HIGH FIX 5: Loyalty accounts - allow users to read their own balance
-- Risk: Users cannot read their own loyalty account balance
-- =============================================================================
DROP POLICY IF EXISTS "loyalty_accounts service role all" ON public.loyalty_accounts;

CREATE POLICY "loyalty_accounts service role all" ON public.loyalty_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "loyalty_accounts read own" ON public.loyalty_accounts;
CREATE POLICY "loyalty_accounts read own" ON public.loyalty_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- HIGH FIX 6: Promo code uses - allow users to read their own usage
-- Risk: Users cannot read their own promo code usage history
-- =============================================================================
DROP POLICY IF EXISTS "promo_code_uses service role all" ON public.promo_code_uses;

CREATE POLICY "promo_code_uses service role all" ON public.promo_code_uses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "promo_code_uses read own" ON public.promo_code_uses;
CREATE POLICY "promo_code_uses read own" ON public.promo_code_uses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- MEDIUM FIX 7: Add missing update policy for orders (users can update own)
-- =============================================================================
DROP POLICY IF EXISTS "orders update own" ON public.orders;
CREATE POLICY "orders update own" ON public.orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SECURITY HARDENING: Add policy for saved_payment_methods
-- Risk: Users should only access their own payment methods
-- =============================================================================
DROP POLICY IF EXISTS "saved_payment_methods own all" ON public.saved_payment_methods;
CREATE POLICY "saved_payment_methods own all" ON public.saved_payment_methods
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "saved_payment_methods service role all" ON public.saved_payment_methods;
CREATE POLICY "saved_payment_methods service role all" ON public.saved_payment_methods
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for abandoned_carts
-- Risk: Users should only access their own abandoned carts
-- =============================================================================
DROP POLICY IF EXISTS "abandoned_carts own all" ON public.abandoned_carts;
CREATE POLICY "abandoned_carts own all" ON public.abandoned_carts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "abandoned_carts service role all" ON public.abandoned_carts;
CREATE POLICY "abandoned_carts service role all" ON public.abandoned_carts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for wishlist_shares
-- Risk: Ensure proper access control for shared wishlists
-- =============================================================================
-- The existing policies look good, but let's ensure service role has access
DROP POLICY IF EXISTS "wishlist_shares service role all" ON public.wishlist_shares;
CREATE POLICY "wishlist_shares service role all" ON public.wishlist_shares
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for wishlists
-- Risk: Users should only access their own wishlists
-- =============================================================================
DROP POLICY IF EXISTS "users manage own wishlist" ON public.wishlists;

DROP POLICY IF EXISTS "wishlists own all" ON public.wishlists;
CREATE POLICY "wishlists own all" ON public.wishlists
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "wishlists service role all" ON public.wishlists;
CREATE POLICY "wishlists service role all" ON public.wishlists
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for reviews
-- Risk: Ensure proper access control for reviews
-- =============================================================================
DROP POLICY IF EXISTS "reviews service role all" ON public.reviews;
CREATE POLICY "reviews service role all" ON public.reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for review_helpful_votes
-- Risk: Table uses voter_key instead of user_id, so service role only
-- =============================================================================
DROP POLICY IF EXISTS "review_helpful_votes service role all" ON public.review_helpful_votes;
CREATE POLICY "review_helpful_votes service role all" ON public.review_helpful_votes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for addresses
-- Risk: Ensure proper access control for addresses
-- =============================================================================
DROP POLICY IF EXISTS "addresses service role all" ON public.addresses;
CREATE POLICY "addresses service role all" ON public.addresses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for contact_messages
-- Risk: Contact form messages - service role only for management
-- =============================================================================
DROP POLICY IF EXISTS "contact_messages service role all" ON public.contact_messages;
CREATE POLICY "contact_messages service role all" ON public.contact_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for customer_testimonials
-- Risk: Users should only manage their own testimonials
-- =============================================================================
DROP POLICY IF EXISTS "customer_testimonials own all" ON public.customer_testimonials;
CREATE POLICY "customer_testimonials own all" ON public.customer_testimonials
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "customer_testimonials service role all" ON public.customer_testimonials;
CREATE POLICY "customer_testimonials service role all" ON public.customer_testimonials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for corporate_bulk_requests
-- Risk: Corporate bulk request form - service role only for management
-- =============================================================================
DROP POLICY IF EXISTS "corporate_bulk_requests service role all" ON public.corporate_bulk_requests;
CREATE POLICY "corporate_bulk_requests service role all" ON public.corporate_bulk_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for push_subscriptions
-- Risk: Users should only manage their own push subscriptions
-- =============================================================================
DROP POLICY IF EXISTS "push_subscriptions own all" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions own all" ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions service role all" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions service role all" ON public.push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for newsletter_subscribers
-- Risk: Newsletter subscriptions - service role only for management
-- =============================================================================
DROP POLICY IF EXISTS "newsletter_subscribers service role all" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_subscribers service role all" ON public.newsletter_subscribers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for user_events
-- Risk: Users should only access their own user events
-- =============================================================================
DROP POLICY IF EXISTS "user_events own all" ON public.user_events;
CREATE POLICY "user_events own all" ON public.user_events
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_events service role all" ON public.user_events;
CREATE POLICY "user_events service role all" ON public.user_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for profiles
-- Risk: Users should only access their own profiles
-- =============================================================================
DROP POLICY IF EXISTS "profiles own all" ON public.profiles;
CREATE POLICY "profiles own all" ON public.profiles
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles service role all" ON public.profiles;
CREATE POLICY "profiles service role all" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for users table
-- Risk: Users should only read their own user data
-- =============================================================================
DROP POLICY IF EXISTS "users service role all" ON public.users;

CREATE POLICY "users service role all" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "users read own" ON public.users;
CREATE POLICY "users read own" ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- =============================================================================
-- SECURITY HARDENING: Add policies for products
-- Risk: Ensure proper access control for products
-- =============================================================================
DROP POLICY IF EXISTS "products service role all" ON public.products;
CREATE POLICY "products service role all" ON public.products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for product_variants
-- Risk: Ensure proper access control for product variants
-- =============================================================================
DROP POLICY IF EXISTS "product_variants service role all" ON public.product_variants;
CREATE POLICY "product_variants service role all" ON public.product_variants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for order_items
-- Risk: Users should only access order items from their own orders
-- =============================================================================
DROP POLICY IF EXISTS "order_items read own" ON public.order_items;
CREATE POLICY "order_items read own" ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "order_items service role all" ON public.order_items;
CREATE POLICY "order_items service role all" ON public.order_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for store settings tables
-- Risk: Only admins should access store settings
-- =============================================================================
DROP POLICY IF EXISTS "store_settings admins all" ON public.store_settings;
CREATE POLICY "store_settings admins all" ON public.store_settings
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "store_settings service role all" ON public.store_settings;
CREATE POLICY "store_settings service role all" ON public.store_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "store_business_settings admins all" ON public.store_business_settings;
CREATE POLICY "store_business_settings admins all" ON public.store_business_settings
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "store_business_settings service role all" ON public.store_business_settings;
CREATE POLICY "store_business_settings service role all" ON public.store_business_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "store_commerce_settings admins all" ON public.store_commerce_settings;
CREATE POLICY "store_commerce_settings admins all" ON public.store_commerce_settings
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "store_commerce_settings service role all" ON public.store_commerce_settings;
CREATE POLICY "store_commerce_settings service role all" ON public.store_commerce_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "store_owner_flags admins all" ON public.store_owner_flags;
CREATE POLICY "store_owner_flags admins all" ON public.store_owner_flags
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "store_owner_flags service role all" ON public.store_owner_flags;
CREATE POLICY "store_owner_flags service role all" ON public.store_owner_flags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for shipping_zones
-- Risk: Only admins should manage shipping zones
-- =============================================================================
DROP POLICY IF EXISTS "shipping_zones read all" ON public.shipping_zones;
CREATE POLICY "shipping_zones read all" ON public.shipping_zones
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "shipping_zones admins all" ON public.shipping_zones;
CREATE POLICY "shipping_zones admins all" ON public.shipping_zones
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "shipping_zones service role all" ON public.shipping_zones;
CREATE POLICY "shipping_zones service role all" ON public.shipping_zones
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for addon_categories
-- Risk: Only admins should manage addon categories
-- =============================================================================
DROP POLICY IF EXISTS "addon_categories read all" ON public.addon_categories;
CREATE POLICY "addon_categories read all" ON public.addon_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "addon_categories admins all" ON public.addon_categories;
CREATE POLICY "addon_categories admins all" ON public.addon_categories
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "addon_categories service role all" ON public.addon_categories;
CREATE POLICY "addon_categories service role all" ON public.addon_categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for addons
-- Risk: Only admins should manage addons
-- =============================================================================
DROP POLICY IF EXISTS "addons read all" ON public.addons;
CREATE POLICY "addons read all" ON public.addons
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "addons admins all" ON public.addons;
CREATE POLICY "addons admins all" ON public.addons
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "addons service role all" ON public.addons;
CREATE POLICY "addons service role all" ON public.addons
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for product_addons
-- Risk: Only admins should manage product_addons
-- =============================================================================
DROP POLICY IF EXISTS "product_addons admins all" ON public.product_addons;
CREATE POLICY "product_addons admins all" ON public.product_addons
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "product_addons service role all" ON public.product_addons;
CREATE POLICY "product_addons service role all" ON public.product_addons
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for bundle_offers
-- Risk: Only admins should manage bundle offers
-- =============================================================================
DROP POLICY IF EXISTS "bundle_offers read active" ON public.bundle_offers;
CREATE POLICY "bundle_offers read active" ON public.bundle_offers
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "bundle_offers admins all" ON public.bundle_offers;
CREATE POLICY "bundle_offers admins all" ON public.bundle_offers
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "bundle_offers service role all" ON public.bundle_offers;
CREATE POLICY "bundle_offers service role all" ON public.bundle_offers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for gift_boxes and related tables
-- Risk: Ensure proper access control for gift box features
-- =============================================================================
DROP POLICY IF EXISTS "gift_boxes own all" ON public.gift_boxes;
CREATE POLICY "gift_boxes own all" ON public.gift_boxes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "gift_boxes service role all" ON public.gift_boxes;
CREATE POLICY "gift_boxes service role all" ON public.gift_boxes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "gift_box_designs admins all" ON public.gift_box_designs;
CREATE POLICY "gift_box_designs admins all" ON public.gift_box_designs
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "gift_box_designs service role all" ON public.gift_box_designs;
CREATE POLICY "gift_box_designs service role all" ON public.gift_box_designs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "gift_box_sizes admins all" ON public.gift_box_sizes;
CREATE POLICY "gift_box_sizes admins all" ON public.gift_box_sizes
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "gift_box_sizes service role all" ON public.gift_box_sizes;
CREATE POLICY "gift_box_sizes service role all" ON public.gift_box_sizes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for mystery_box_rules
-- Risk: Only admins should manage mystery box rules
-- =============================================================================
DROP POLICY IF EXISTS "mystery_box_rules admins all" ON public.mystery_box_rules;
CREATE POLICY "mystery_box_rules admins all" ON public.mystery_box_rules
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "mystery_box_rules service role all" ON public.mystery_box_rules;
CREATE POLICY "mystery_box_rules service role all" ON public.mystery_box_rules
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for occasion_templates
-- Risk: Only admins should manage occasion templates
-- =============================================================================
DROP POLICY IF EXISTS "occasion_templates admins all" ON public.occasion_templates;
CREATE POLICY "occasion_templates admins all" ON public.occasion_templates
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "occasion_templates service role all" ON public.occasion_templates;
CREATE POLICY "occasion_templates service role all" ON public.occasion_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for announcements
-- Risk: Only admins should manage announcements
-- =============================================================================
DROP POLICY IF EXISTS "announcements read active" ON public.announcements;
CREATE POLICY "announcements read active" ON public.announcements
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "announcements admins all" ON public.announcements;
CREATE POLICY "announcements admins all" ON public.announcements
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "announcements service role all" ON public.announcements;
CREATE POLICY "announcements service role all" ON public.announcements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for announcement_user_state
-- Risk: Users should only access their own announcement state
-- =============================================================================
DROP POLICY IF EXISTS "announcement_user_state own all" ON public.announcement_user_state;
CREATE POLICY "announcement_user_state own all" ON public.announcement_user_state
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "announcement_user_state service role all" ON public.announcement_user_state;
CREATE POLICY "announcement_user_state service role all" ON public.announcement_user_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for announcement_events
-- Risk: Only admins should manage announcement events
-- =============================================================================
DROP POLICY IF EXISTS "announcement_events admins all" ON public.announcement_events;
CREATE POLICY "announcement_events admins all" ON public.announcement_events
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "announcement_events service role all" ON public.announcement_events;
CREATE POLICY "announcement_events service role all" ON public.announcement_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for admin tables
-- Risk: Only admins should access admin tables
-- =============================================================================
DROP POLICY IF EXISTS "admin_invites admins all" ON public.admin_invites;
CREATE POLICY "admin_invites admins all" ON public.admin_invites
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "admin_invites service role all" ON public.admin_invites;
CREATE POLICY "admin_invites service role all" ON public.admin_invites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin_presence_sessions admins all" ON public.admin_presence_sessions;
CREATE POLICY "admin_presence_sessions admins all" ON public.admin_presence_sessions
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "admin_presence_sessions service role all" ON public.admin_presence_sessions;
CREATE POLICY "admin_presence_sessions service role all" ON public.admin_presence_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "customer_admin_notes admins all" ON public.customer_admin_notes;
CREATE POLICY "customer_admin_notes admins all" ON public.customer_admin_notes
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "customer_admin_notes service role all" ON public.customer_admin_notes;
CREATE POLICY "customer_admin_notes service role all" ON public.customer_admin_notes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for tracking tables
-- Risk: Tracking tables should be service role only
-- =============================================================================
-- All tracking tables already have service role policies, which is correct
-- No changes needed for tracking tables

-- =============================================================================
-- SECURITY HARDENING: Add policies for email system tables
-- Risk: Only admins should manage email system
-- =============================================================================
DROP POLICY IF EXISTS "email_templates admins all" ON public.email_templates;
CREATE POLICY "email_templates admins all" ON public.email_templates
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "email_templates service role all" ON public.email_templates;
CREATE POLICY "email_templates service role all" ON public.email_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "email_queue admins all" ON public.email_queue;
CREATE POLICY "email_queue admins all" ON public.email_queue
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "email_queue service role all" ON public.email_queue;
CREATE POLICY "email_queue service role all" ON public.email_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "email_logs admins all" ON public.email_logs;
CREATE POLICY "email_logs admins all" ON public.email_logs
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "email_logs service role all" ON public.email_logs;
CREATE POLICY "email_logs service role all" ON public.email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "failed_emails admins all" ON public.failed_emails;
CREATE POLICY "failed_emails admins all" ON public.failed_emails
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "failed_emails service role all" ON public.failed_emails;
CREATE POLICY "failed_emails service role all" ON public.failed_emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "email_provider_settings admins all" ON public.email_provider_settings;
CREATE POLICY "email_provider_settings admins all" ON public.email_provider_settings
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "email_provider_settings service role all" ON public.email_provider_settings;
CREATE POLICY "email_provider_settings service role all" ON public.email_provider_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "smtp_configs admins all" ON public.smtp_configs;
CREATE POLICY "smtp_configs admins all" ON public.smtp_configs
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "smtp_configs service role all" ON public.smtp_configs;
CREATE POLICY "smtp_configs service role all" ON public.smtp_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for notification system
-- Risk: Only admins should manage notification system
-- =============================================================================
DROP POLICY IF EXISTS "notification_templates admins all" ON public.notification_templates;
CREATE POLICY "notification_templates admins all" ON public.notification_templates
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "notification_templates service role all" ON public.notification_templates;
CREATE POLICY "notification_templates service role all" ON public.notification_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "notification_jobs admins all" ON public.notification_jobs;
CREATE POLICY "notification_jobs admins all" ON public.notification_jobs
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "notification_jobs service role all" ON public.notification_jobs;
CREATE POLICY "notification_jobs service role all" ON public.notification_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "notification_logs admins all" ON public.notification_logs;
CREATE POLICY "notification_logs admins all" ON public.notification_logs
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "notification_logs service role all" ON public.notification_logs;
CREATE POLICY "notification_logs service role all" ON public.notification_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_log admins all" ON public.notifications_log;
CREATE POLICY "notifications_log admins all" ON public.notifications_log
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "notifications_log service role all" ON public.notifications_log;
CREATE POLICY "notifications_log service role all" ON public.notifications_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for expenses
-- Risk: Only admins should manage expenses
-- =============================================================================
DROP POLICY IF EXISTS "expenses admins all" ON public.expenses;
CREATE POLICY "expenses admins all" ON public.expenses
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "expenses service role all" ON public.expenses;
CREATE POLICY "expenses service role all" ON public.expenses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for invoices
-- Risk: Users should only access their own invoices
-- =============================================================================
DROP POLICY IF EXISTS "invoices read own" ON public.invoices;
CREATE POLICY "invoices read own" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = invoices.order_id AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "invoices admins all" ON public.invoices;
CREATE POLICY "invoices admins all" ON public.invoices
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "invoices service role all" ON public.invoices;
CREATE POLICY "invoices service role all" ON public.invoices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for blocked_emails
-- Risk: Only admins should manage blocked emails
-- =============================================================================
DROP POLICY IF EXISTS "blocked_emails admins all" ON public.blocked_emails;
CREATE POLICY "blocked_emails admins all" ON public.blocked_emails
  FOR ALL
  TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS "blocked_emails service role all" ON public.blocked_emails;
CREATE POLICY "blocked_emails service role all" ON public.blocked_emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SECURITY HARDENING: Add policies for recovery_discount_codes
-- Risk: Recovery discount codes use cart_id, not user_id - service role only
-- =============================================================================
DROP POLICY IF EXISTS "recovery_discount_codes service role all" ON public.recovery_discount_codes;
CREATE POLICY "recovery_discount_codes service role all" ON public.recovery_discount_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- Index additions for performance and security
-- =============================================================================
CREATE INDEX IF NOT EXISTS promo_codes_is_active_idx ON public.promo_codes(is_active);
CREATE INDEX IF NOT EXISTS discounts_active_idx ON public.discounts(active);
CREATE INDEX IF NOT EXISTS loyalty_accounts_user_id_idx ON public.loyalty_accounts(user_id);
CREATE INDEX IF NOT EXISTS promo_code_uses_user_id_idx ON public.promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments(order_id);
