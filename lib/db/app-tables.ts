/**
 * Tables the Cookie Bite app reads/writes — used for schema health checks.
 * Keep in sync with supabase/checks/expected-app-tables.json
 */
export const APP_DATABASE_TABLES = [
  "users",
  "products",
  "orders",
  "order_items",
  "addresses",
  "wishlists",
  "promo_codes",
  "shipping_zones",
  "gift_boxes",
  "payments",
  "invoices",
  "expenses",
  "audit_logs",
  "notification_templates",
  "notification_logs",
  "notification_jobs",
  "customer_testimonials",
  "customer_admin_notes",
  "newsletter_subscribers",
  "loyalty_accounts",
  "loyalty_transactions",
  "chat_messages",
  "push_subscriptions",
  "reviews",
  "schema_migrations",
  "abandoned_carts",
  "recovery_discount_codes",
] as const;

export type AppDatabaseTable = (typeof APP_DATABASE_TABLES)[number];
