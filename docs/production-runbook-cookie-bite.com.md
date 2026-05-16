# Cookie Bite Production Runbook (`cookie-bite.com`)

This runbook is the execution checklist for release day and incident triage.
Use it with `docs/hostinger-production-cookie-bite.com-checklist.md`.

## 0) Preconditions

- Branch is merged and CI is green (`lint`, `type-check`, `test`, `build`, smoke E2E when enabled, Supabase checks when secrets are configured).
- You have dashboard access to Hostinger, Clerk, Supabase, Paymob, Resend.
- You have production values for:
  - `PAYMOB_API_KEY`
  - `PAYMOB_HMAC_SECRET` (أو legacy `PAYMOB_HMAC`)
  - `PAYMOB_INTEGRATION_ID_CARD`, `PAYMOB_INTEGRATION_ID_WALLET`
  - `INTERNAL_API_SECRET`, `REVALIDATE_SECRET`, `CLERK_WEBHOOK_SIGNING_SECRET`

## 1) Database Migrations (Supabase)

Run migrations in this exact order (أو استخدم `node scripts/supabase-run-migrations.mjs` الذي يفرز الملفات تلقائيًا):

1. `0001_init.sql`
2. `0002_*` (إن وُجد)
3. `0003_v2_extend_schema.sql`
4. `0004_audit_logs.sql`
5. `0005_phase_cde_foundations.sql`
6. `0006_customer_testimonials.sql`
7. `0007_5_rls_helper_is_admin_or_owner.sql` — **قبل 0008**: يعرّف `is_admin_or_owner()` المستخدمة في سياسات RLS.
8. `0007_shipping_zones_sort_order.sql`
9. `0008_schema_alignment_and_security.sql`
10. `0009_orders_legacy_modern_sync.sql`
11. `0010_phase_cde_compat_patch.sql`
12. `0011_mr_brownie_chat_history.sql` — جلسات وحفظ محادثة Mr. Brownie
13. `0012_chat_messages.sql` — رسائل المحادثة
14. `0013_checkout_idempotency.sql` — مفتاح إيديمبوتنسي للدفع/الطلب
15. `0014_chat_messages_rls.sql` — RLS لرسائل المحادثة
16. `0015_orders_user_id_users_fkey.sql` — علاقة `orders.user_id` → `users`

مرجع متغيرات Hostinger: [`docs/hostinger-environment-variables.md`](hostinger-environment-variables.md).

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
- `PAYMOB_HMAC_SECRET` (أو `PAYMOB_HMAC`)
- `PAYMOB_INTEGRATION_ID_CARD`, `PAYMOB_INTEGRATION_ID_WALLET`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `GEMINI_API_KEY` (موصى به — Mrs. Cookie / Mr. Brownie)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `INTERNAL_API_SECRET`
- `REVALIDATE_SECRET`

Optional hard-fail guard:

- `COOKIE_BITE_FAIL_ON_MISSING_ENV=true`

### مراقبة أخطاء منظّمة (structured errors)

- `COOKIE_BITE_LOG_WEBHOOK_URL` — عنوان HTTPS (مثل لوحة المراقبة أو Zapier) يستقبل `POST` بجسم JSON من `logStructuredError` (بعد تعقيم الحقول الحساسة). إن لم يُضف، يبقى السجل عبر `console` فقط.
- `COOKIE_BITE_SERVICE_NAME` — اسم الخدمة في السجل (افتراضي: `cookie-bite-web`).
- `COOKIE_BITE_CORRELATION_ID` — اختياري على مستوى العملية (مثلاً من منصة الاستضافة)؛ يمكن أيضًا تمرير `correlationId` داخل الـ context عند استدعاء المسجّل.

لربط **Sentry** أو **OpenTelemetry** لاحقًا: أوّل خطوة غالبًا تكمن في إرسال نفس حمولة JSON إلى متلقي متوافق عبر الويبهوك أعلاه، أو دمج SDK في `instrumentation.ts` حسب اختيارك.

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

مع أسرار Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ACCESS_TOKEN`) يمكن تشغيل فحوصات الإنتاج القريبة من CI:

```bash
node scripts/supabase-security-check.mjs
node scripts/supabase-schema-snapshot-check.mjs
```

## 5) Known Non-blocking Warnings

- Clerk dev-keys warning in non-production env.
- Next dev-mode `eval` warning under strict CSP (not a production runtime blocker).

## 6) Rollback Plan

If deploy fails:

1. Revert Hostinger app to previous known-good commit (أو إعادة النشر من وسيط مثل Git من نسخة معروفة).
2. Keep DB schema forward-only (do not drop live tables under incident pressure).
3. Disable risky admin mutations via temporary feature gating in env if needed.
4. Re-run smoke checklist.

### DB / RLS خلال حادثة

- تحقّق من تنفيذ كل المايجريشنز بما فيها **`0007_5_rls_helper_is_admin_or_owner.sql`** قبل **`0008_*`**؛ بدون `is_admin_or_owner()` تفشل سياسات 0008.
- نفّذ (بعد تمرير أسرار Supabase) من جهة موثوقة:

```bash
node scripts/supabase-security-check.mjs
node scripts/supabase-schema-snapshot-check.mjs
```

- راجع السجلات المركّبة: `logStructuredError` + أي وبهوك `COOKIE_BITE_LOG_WEBHOOK_URL`.

## 7) Incident Triage Quick Map

- Auth failure: Clerk domain/redirect settings + `CLERK_SECRET_KEY`.
- Payment callback failure: `PAYMOB_HMAC_SECRET` / `PAYMOB_HMAC`, webhook URL, logs.
- Admin 403: role mapping (`resolveStaffRoleFromEmail`) + Clerk email.
- Missing data in admin: Supabase service key / RLS / migration state; شغّل فحص الـ snapshot للجداول الأساسية (`scripts/supabase-schema-snapshot-check.mjs`).
- Structured errors: راقب محتوى JSON من `logStructuredError` أو الوبهوك؛ استخدم `correlationId` لتتبع مسار الدفع أو الـ webhook.
