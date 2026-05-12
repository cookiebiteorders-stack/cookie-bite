# Database Security Audit (Supabase)

Date: 2026-05-12  
Scope: `public` schema RLS, policies, function privilege posture, and schema alignment with application usage.

## Executive Summary

- All inspected `public` tables currently have `rowsecurity = true`.
- The app now has required operational tables present: `gift_boxes`, `payments`, `invoices`, `notification_templates`, `customer_testimonials`, `expenses`.
- A compatibility migration was added to keep `orders` legacy and modern columns synchronized during transition.
- Primary residual risk is policy breadth on a few tables where read access is intentionally broad (`products`, active notification templates, active shared gift boxes).

## Role-by-Role Access Posture

### anon (unauthenticated)

- Can read active product catalog via `products are public read`.
- Can read active `notification_templates` (public content templates only).
- Can read active `gift_boxes` if queried by token path in API flow.
- Cannot write protected business tables directly under RLS.

### authenticated user

- Own-data access patterns exist for core self-service tables:
  - `addresses` (own select/insert/update/delete)
  - `wishlists` (own management)
  - `customer_testimonials` (own insert/select)
  - `gift_boxes` (owner read/write)
  - `orders` and `order_items` (own read, constrained insert paths)
- Admin-protected reads use helper predicates (`is_admin_or_owner`, `is_staff_or_above`).

### admin/owner

- Elevated read/write paths are policy-gated on selected tables (`discounts`, `expenses`, `notifications_log`, `invoices`, `payments`, etc.).
- `audit_logs` remain immutable (no update/delete policies allow mutation).

### service_role

- Full operational access is available where required by backend Route Handlers.
- Added policies explicitly permit `service_role` for newly aligned tables.

## Key Findings

1. Schema drift existed between app expectations and live DB (missing operational tables and mixed `orders` column generations).
2. RLS is globally enabled across audited `public` tables.
3. Security-definer helper functions are present and constrained with `search_path=public` where configured.
4. `orders` had dual column families (legacy + modern), creating risk of inconsistent reads/writes before synchronization.

## Remediation Applied

- Added `0008_schema_alignment_and_security.sql` to create missing tables, indexes, RLS, and policies.
- Added `0009_orders_legacy_modern_sync.sql` to:
  - Backfill legacy/modern `orders` fields both directions.
  - Enforce synchronization through trigger `trg_orders_sync_legacy_modern`.
  - Add supporting indexes for modern read paths.
- Updated `scripts/supabase-run-migrations.mjs` to include latest migrations and continue execution with failure reporting.

## Residual Recommendations

1. Plan a final deprecation migration to remove legacy `orders` columns after codebase fully migrates to modern columns.
2. Evaluate whether `notification_templates public read active` should remain public or be restricted to authenticated clients.
3. Add periodic policy regression checks in CI (query `pg_policies` + snapshot diff).
4. Add smoke tests for critical API table dependencies (`orders`, `payments`, `invoices`, `gift_boxes`).
