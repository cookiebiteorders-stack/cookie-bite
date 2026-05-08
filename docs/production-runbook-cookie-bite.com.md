# Cookie Bite Production Runbook (`cookie-bite.com`)

This runbook is the execution checklist for release day and incident triage.
Use it with `docs/hostinger-production-cookie-bite.com-checklist.md`.

## 0) Preconditions

- Branch is merged and CI is green (`lint`, `type-check`, `test`).
- You have dashboard access to Hostinger, Clerk, Supabase, Paymob, Resend.
- You have production values for:
  - `PAYMOB_API_KEY`
  - `PAYMOB_HMAC`
  - `INTERNAL_API_SECRET`

## 1) Database Migrations (Supabase)

Run migrations in this exact order:

1. `0001_init.sql`
2. `0002_*` (if present in your repo)
3. `0003_v2_extend_schema.sql`
4. `0004_audit_logs.sql`
5. `0005_phase_cde_foundations.sql`

Post-migration smoke checks:

- Confirm tables exist:
  - `users`, `products`, `orders`, `order_items`
  - `promo_codes`, `audit_logs`, `expenses`, `shipping_zones`, `notification_templates`
- Confirm RLS is enabled on security-sensitive tables.

## 2) Hostinger Deploy

- Build command: `npm run build`
- Start command: `npm run start`
- Node version: 20+
- SSL on `cookie-bite.com`

Set env values (minimum required):

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

Optional hard-fail guard:

- `COOKIE_BITE_FAIL_ON_MISSING_ENV=true`

## 3) Post-Deploy Smoke (Manual)

Public:

1. Open `/` and verify header/footer load.
2. Open `/shop` and one product page.
3. Submit `/contact` form.

Auth:

1. Open `/sign-in` and `/sign-up`.
2. Complete sign-in and verify redirect to `/account`.

Admin:

1. Open `/admin` (with admin/owner account).
2. Verify:
   - `/admin/orders`
   - `/admin/customers`
   - `/admin/products`
   - `/admin/settings`
3. Verify `/admin/audit-logs` has records after an admin mutation.

Commerce:

1. Create test order.
2. Complete payment flow.
3. Verify callback path `/api/webhooks/paymob` receives payload.

## 4) Automated Verification Commands

Run on server or release machine:

```bash
npm run lint
npm run type-check
npm run test
npm run test:e2e
npm run build
```

## 5) Known Non-blocking Warnings

- Clerk dev-keys warning in non-production env.
- Next dev-mode `eval` warning under strict CSP (not a production runtime blocker).

## 6) Rollback Plan

If deploy fails:

1. Revert Hostinger app to previous known-good commit.
2. Keep DB schema forward-only (do not drop live tables under incident pressure).
3. Disable risky admin mutations via temporary feature gating in env if needed.
4. Re-run smoke checklist.

## 7) Incident Triage Quick Map

- Auth failure: Clerk domain/redirect settings + `CLERK_SECRET_KEY`.
- Payment callback failure: `PAYMOB_HMAC`, webhook URL, logs.
- Admin 403: role mapping (`resolveStaffRoleFromEmail`) + Clerk email.
- Missing data in admin: Supabase service key / RLS / migration state.

