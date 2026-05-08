# الملف التعريفي الكامل — موقع Cookie Bite

هذا الملف هو مرجع شامل لحالة الموقع الحالية (تقنية + تشغيلية + أمنية) بناءً على الكود الموجود الآن.

## 1) الهوية العامة للمشروع

- **اسم المشروع:** Cookie Bite
- **الدومين الإنتاجي الأساسي:** `https://cookie-bite.com`
- **الإطار:** Next.js 16 (App Router)
- **اللغة:** TypeScript (strict)
- **الواجهات:** React 19 + Tailwind
- **قاعدة البيانات:** Supabase PostgreSQL + RLS
- **المصادقة:** Clerk
- **الدفع:** Paymob
- **الإيميلات:** Resend
- **CMS:** Sanity
- **PWA:** مفعّل عبر `next-pwa`

## 2) المعمارية (Architecture)

### طبقات المشروع

- **Presentation Layer (UI):**
  - صفحات `app/(site)` للواجهة العامة.
  - صفحات `app/(admin)` للوحة التحكم.
  - صفحات `app/(auth)` لتدفقات تسجيل الدخول.
- **Application/API Layer:**
  - Route Handlers تحت `app/api/**`.
  - تحقق إداري RBAC عبر `requireAdminAccess`.
  - تحقق داخلي للخدمات عبر `verifyInternalSecret`.
- **Data Layer:**
  - Supabase Admin Client على السيرفر.
  - Migrations منظمة في `supabase/migrations`.

### الحماية

- `proxy.ts` مسؤول عن:
  - حماية المسارات الحساسة.
  - rate limit.
  - canonical host enforcement في الإنتاج (`cookie-bite.com`).

## 3) الصفحات (Pages Inventory)

### الموقع العام

- `/`
- `/shop`
- `/shop/[slug]`
- `/search`
- `/cart`
- `/checkout`
- `/checkout/paymob-response`
- `/checkout/thank-you`
- `/gift-box`
- `/blog`
- `/our-cookies`
- `/our-story`
- `/contact`
- `/help/faq`
- `/help/returns`
- `/privacy`
- `/terms`
- `/account`

### المصادقة

- `/sign-in/[[...sign-in]]`
- `/sign-up/[[...sign-up]]`
- `/sso-callback`
- صفحات أخطاء/تحميل auth موجودة.

### لوحة الإدارة

- `/admin`
- `/admin/orders`
- `/admin/customers`
- `/admin/products`
- `/admin/discounts`
- `/admin/reports`
- `/admin/financial`
- `/admin/invoices`
- `/admin/payments`
- `/admin/shipping`
- `/admin/roles`
- `/admin/settings`
- `/admin/audit-logs`

## 4) APIs (Inventory مختصر)

### Core Commerce

- `/api/products`, `/api/products/[slug]`, `/api/products/search`
- `/api/orders`, `/api/orders/[id]`, `/api/orders/[id]/cancel`
- `/api/promo/validate`
- `/api/checkout/paymob/intention`
- `/api/webhooks/paymob`
- `/api/webhooks/clerk`

### Customer Features

- `/api/wishlist`, `/api/wishlist/[productId]`
- `/api/loyalty`, `/api/loyalty/redeem`, `/api/loyalty/referral`
- `/api/gift-box`, `/api/gift-box/[id]`, `/api/gift-box/[id]/add-to-cart`, `/api/gift-box/share/[token]`
- `/api/push/subscribe`, `/api/push/send`

### Notifications + CMS Infra

- `/api/notifications/order-confirmed`
- `/api/notifications/order-status`
- `/api/sanity/webhook`
- `/api/revalidate`
- `/api/contact`, `/api/newsletter`

### Admin APIs

- Orders: `/api/admin/orders`, `/api/admin/orders/[id]`
- Customers: `/api/admin/customers`
- Products: `/api/admin/products`, `/api/admin/products/sync`
- Discounts: `/api/admin/discounts`
- Analytics: `/api/admin/analytics`, `/api/admin/reports/overview`
- Financial: `/api/admin/financial/summary`
- Shipping: `/api/admin/shipping-zones`
- Notifications Templates: `/api/admin/notifications/templates`
- Payments: `/api/admin/payments/summary`
- Invoices: `/api/admin/invoices`
- Roles: `/api/admin/roles/matrix`
- Settings health: `/api/admin/settings/health`
- Audit logs: `/api/admin/audit-logs`
- Admin push broadcast: `/api/admin/push/broadcast`

## 5) قاعدة البيانات (DB Profile)

### ملفات المهاجرات

- `0001_init.sql`
- `0002_orders_paymob.sql`
- `0003_v2_extend_schema.sql`
- `0004_audit_logs.sql`
- `0005_phase_cde_foundations.sql`

### جداول محورية

- الهوية والمستخدمين: `users`
- المنتجات والطلبات: `products`, `orders`, `order_items`
- الخصومات والولاء: `promo_codes`, `promo_code_uses`, `loyalty_*`
- قائمة الرغبات والهدايا: `wishlists`, `gift-box*`
- الحوكمة: `audit_logs`
- المالية والشحن والإشعارات: `expenses`, `shipping_zones`, `notification_templates`

### ملاحظات

- `audit_logs` معمولة كـ immutable لرفع الامتثال.
- RLS مفعلة في جداول حساسة.

## 6) إدارة الصلاحيات RBAC

- الأدوار المدعومة: `owner`, `admin`, `staff`, `customer`.
- مصفوفة الصلاحيات في `lib/admin/rbac.ts`.
- التحقق المركزي:
  - `requireAdminAccess`
  - `requireWritePermission`
  - `requireFullPermission`

## 7) إدارة الأخطاء والمرونة

- Global boundary:
  - `app/error.tsx`
  - `app/global-error.tsx`
  - `components/error-boundary.tsx`
- API validation: Zod مركزي في `lib/validations/index.ts`.
- Logging:
  - `lib/logger.ts` مع redaction للحقول الحساسة.
- Frontend API helper:
  - `lib/http/fetch-json.ts` (timeout + retry + parse handling).

## 8) الأمن (Security Posture)

- Canonical domain enforcement في proxy.
- Security headers في `next.config.ts`.
- Internal secret verification (timing-safe compare) في `lib/auth/verify-internal.ts`.
- منع تسريب أسرار عبر structured logging sanitizer.

## 9) الاختبارات (QA/Test Profile)

### Unit + Integration (Jest)

- مفعل بالكامل عبر `jest.config.mjs`.
- الاختبارات الحالية تشمل:
  - utils (`fetch-json`, `logger`, `schedule-effect-task`)
  - Error boundary
  - Admin API integration mocks (`orders`, `products`, `discounts`, `financial`, `notifications templates`, `settings health`)
  - صفحات Admin لحالات الخطأ/إعادة المحاولة (`reports`, `settings`)

### E2E (Playwright)

- إعداد: `playwright.config.ts`
- Smoke suite: `e2e/smoke.spec.ts`
- يغطي:
  - تحميل الصفحة الرئيسية.
  - سلوك API منتجات بشكل متحكم.
  - حراسة `/admin`.

## 10) التشغيل والنشر

- أوامر أساسية:
  - `npm run lint`
  - `npm run type-check`
  - `npm run test`
  - `npm run test:e2e`
  - `npm run build`
- استضافة مستهدفة: Hostinger (Node 20+).
- `output: "standalone"` مفعلة.

## 11) البيئة (Environment Profile)

فئات المتغيرات المطلوبة:

- App domain:
  - `NEXT_PUBLIC_APP_URL`
  - `APP_BASE_URL`
  - `COOKIE_BITE_PRIMARY_DOMAIN`
- Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_KEY`
- Clerk:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
- Paymob:
  - `PAYMOB_API_KEY`
  - `PAYMOB_HMAC`
- Resend:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
- Internal/infra:
  - `INTERNAL_API_SECRET`
  - `REVALIDATE_SECRET`

## 12) المخاطر/الملاحظات المتبقية

- إذا لم تكن migrations مطبقة على مشروع Supabase النشط، بعض APIs ستفشل (مثال: missing table in schema cache).
- تحذيرات dev من Clerk keys وReact eval تحت CSP تظهر في التطوير فقط.
- يفضّل إضافة E2E لسيناريو checkout الحقيقي مع test credentials معزولة.

## 13) مراجع تشغيلية سريعة

- `docs/release-one-pager-cookie-bite.com.md`
- `docs/hostinger-production-cookie-bite.com-checklist.md`
- `docs/production-runbook-cookie-bite.com.md`

