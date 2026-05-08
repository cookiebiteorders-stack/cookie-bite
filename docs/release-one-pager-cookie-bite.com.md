# Cookie Bite Release One-Pager (`cookie-bite.com`)

This is the single operational sheet for production release.

## 1) Go / No-Go Gate

Release only if all are green:

- `npm run lint`
- `npm run type-check`
- `npm run test`
- `npm run test:e2e`
- `npm run build`

## 2) Infra + Env

Hostinger:

- Node 20+
- Build: `npm run build`
- Start: `npm run start`
- SSL enabled for `cookie-bite.com`

Required env:

- `NEXT_PUBLIC_APP_URL=https://cookie-bite.com`
- `APP_BASE_URL=https://cookie-bite.com`
- `COOKIE_BITE_PRIMARY_DOMAIN=cookie-bite.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `PAYMOB_API_KEY`
- `PAYMOB_HMAC`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `INTERNAL_API_SECRET`
- `REVALIDATE_SECRET`

Optional strict mode:

- `COOKIE_BITE_FAIL_ON_MISSING_ENV=true`

## 3) DB Migrations Order

Apply in order:

1. `0001_init.sql`
2. `0002_*` (if exists)
3. `0003_v2_extend_schema.sql`
4. `0004_audit_logs.sql`
5. `0005_phase_cde_foundations.sql`

Critical tables check:

- `users`, `products`, `orders`, `order_items`
- `promo_codes`, `audit_logs`, `expenses`, `shipping_zones`, `notification_templates`

## 4) Integrations Check

Clerk:

- Domain + redirects set to `cookie-bite.com`
- Webhook: `/api/webhooks/clerk`

Supabase:

- Site URL/redirects set
- RLS enabled as expected

Paymob:

- Webhook: `/api/webhooks/paymob`
- Return URL: `/checkout/paymob-response`

Resend:

- Domain verified
- Sender valid (example: `orders@cookie-bite.com`)

## 5) Smoke Tests (Release Day)

Public:

- `/`, `/shop`, one product page, `/contact`

Auth:

- `/sign-in`, `/sign-up`, then `/account`

Admin:

- `/admin`, `/admin/orders`, `/admin/customers`, `/admin/products`, `/admin/settings`
- Confirm `/admin/audit-logs` receives events after admin mutation

Commerce:

- Create test order
- Complete payment flow
- Confirm Paymob callback processing

## 6) Rollback (If Needed)

1. Roll app to previous stable commit on Hostinger.
2. Keep DB forward-only during incident (no destructive rollback).
3. Temporarily disable risky admin mutations if necessary.
4. Re-run smoke tests.

## 7) Fast Triage Map

- Auth issue -> Clerk domain/redirects + keys
- Payment issue -> Paymob HMAC/webhook path
- Admin 403 -> role mapping and staff email
- Missing admin data -> migration state / Supabase key / RLS

---

For detailed procedures:

- `docs/hostinger-production-cookie-bite.com-checklist.md`
- `docs/production-runbook-cookie-bite.com.md`
