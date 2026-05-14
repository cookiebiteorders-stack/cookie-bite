# Cookie Bite — مرجع شامل للموقع (واجهة + إدارة + API + بنية)

هذا المستند يصف **كل ما يمكن استنتاجه من الكود الحالي** للمشروع: الصفحات، المسارات البرمجية، التكاملات، قاعدة البيانات، الأمان، والبنية.  
يُحدَّث مع الشيفرة؛ إن غاب شيء من هنا فابحث في المستودع أو اسأل الفريق.

---

## 1. نظرة عامة

| البند | الوصف |
|--------|--------|
| **المنتج** | متجر إلكتروني (حلويات / Cookie Bite) مع **لوحة إدارة** متقدمة |
| **إطار العمل** | [Next.js](https://nextjs.org/) **16** (App Router)، React **19**، TypeScript |
| **التشغيل** | `output: "standalone"` في `next.config.ts`؛ الإنتاج عبر `server.mjs` → `import('.next/standalone/server.js')` |
| **الاستضافة النموذجية** | Vercel أو أي Node ≥ 20 يشغّل `next start` / standalone |
| **اللغات في الواجهة** | عربي / إنجليزي عبر `LanguageProvider` + ملفات ترجمة في `lib/i18n` |
| **المصادقة** | [Clerk](https://clerk.com/) (`@clerk/nextjs`) |
| **قاعدة البيانات** | [Supabase](https://supabase.com/) (Postgres + RLS) |
| **الدفع** | Paymob (Accept API + Webhook HMAC) |
| **CMS / محتوى** | Sanity (عميل + webhook) |
| **بريد** | Resend |
| **ذكاء اصطناعي (شات)** | Google Gemini (`@google/generative-ai`) — مسار Mr Brownie |
| **صور** | Cloudinary (`next-cloudinary`) + نماذج `next/image` |
| **PWA** | `next-pwa` (معطّل في التطوير) |
| **التحقق من المدخلات** | Zod مركزي في `lib/validations/index.ts` |

---

## 2. سكربتات `package.json`

| الأمر | الوظيفة |
|--------|---------|
| `npm run dev` | خادم التطوير Next |
| `npm run build` | بناء إنتاجي |
| `npm run start` | تشغيل `node server.mjs` (standalone مطلوب بعد build) |
| `npm run start:standalone` | تشغيل مباشر لـ `.next/standalone/server.js` |
| `npm run lint` | ESLint |
| `npm run type-check` | `tsc --noEmit` |
| `npm run test` | Jest |
| `npm run test:ci` | Jest في CI بدون تغطية إجبارية |
| `npm run test:e2e` | Playwright |
| `npm run deploy:github` | `scripts/git-sync.mjs` — commit + push |

---

## 3. التبعيات الرئيسية (ملخص)

- **واجهة / تخطيط:** `motion`, `gsap`, `lucide-react`, `tailwindcss` v4, `clsx`, `tailwind-merge`, `next-themes`
- **جداول الإدارة:** `@tanstack/react-table`, `recharts`, `html2canvas`
- **نماذج:** `react-hook-form`, `@hookform/resolvers`, `zod`
- **حالة عميل:** `zustand`
- **اختبار:** `jest`, `@testing-library/*`, `@playwright/test`
- **أخرى:** `three` (تأثيرات)، `svix` (تحقق webhooks Clerk حيث يُستخدم)

---

## 4. هيكل المجلدات (عالي المستوى)

```
app/                    # App Router — صفحات + route handlers
  (site)/               # واجهة المتجر العامة
  (admin)/admin/        # لوحة الإدارة
  (auth)/               # تسجيل الدخول / التسجيل Clerk
  api/                  # REST API (Route Handlers)
components/             # مكوّنات React منظمة حسب النطاق
lib/                    # منطق مشترك، عميل Supabase، تحقق، Paymob، إلخ
stores/                 # Zustand لوحات الإدارة
supabase/migrations/    # ترحيلات SQL
e2e/                    # Playwright
scripts/                # أدوات (مثلاً git-sync)
proxy.ts                # منطق Clerk middleware + rate limit + RBAC مسارات admin
middleware.ts           # يعيد التصدير من proxy.ts (نقطة دخول Next الرسمية)
```

---

## 5. الطبقة الأمامية للطلبات: `middleware.ts` و `proxy.ts`

الملف **`middleware.ts`** يصدّر الافتراضي من **`proxy.ts`** حتى يطبّق Next القيود على كل الطلبات المطابقة لـ `config.matcher`.

### 5.1 ما يفعله `clerkMiddleware`

1. **إنتاج — قفل الدومين:** إن وُجد `PRODUCTION_HOST` (من `COOKIE_BITE_PRIMARY_DOMAIN` في `lib/config/production-lock.ts`) يُفرض HTTPS واسم المضيف القانوني (إعادة توجيه 308).
2. **Webhooks:** مسارات `/api/webhooks/*` تُمرَّر دون rate limit (التحقق داخل كل handler).
3. **Rate limiting في الذاكرة** (مفتاح IP من `x-forwarded-for` / `x-real-ip`):

   | بادئة المسار | الحد التقريبي |
   |--------------|----------------|
   | `/api/checkout`, `/api/payments`, `/api/orders` | 8 طلبات / دقيقة |
   | `/api/promo` | 12 / دقيقة |
   | `/api/contact`, `/api/newsletter` | 5 / دقيقة |
   | `/api/wishlist`, `/api/loyalty`, `/api/push` | 30 / دقيقة |
   | `/api/mr-brownie`, `/api/chat` | 24 / دقيقة |
   | `/api/admin/*` | 60 / دقيقة |

   عند التجاوز: استجابة **429** JSON ثنائية اللغة.

4. **`/account/*`:** يتطلب مستخدم Clerk مسجّل؛ وإلا إعادة توجيه إلى `/sign-in` مع `redirect_url`.
5. **`/admin/*`:** تسجيل دخول + استخراج البريد من Clerk + **`resolveStaffRole`** → يجب أن يكون الدور `owner` | `admin` | `staff` وإلا `/403`. ثم **`canAccess(role, module)`** من `lib/admin/rbac.ts` حسب `adminRouteModuleMap`.

### 5.2 RBAC للمسارات الإدارية

المسارات في `adminRouteModuleMap` تُربَط بوحدات (`ModuleKey`): `dashboard`, `products`, `orders`, `customers`, `discounts`, `media`, `cms`, `analytics`, `financial`, `invoices`, `shipping`, `payments`, `roles`, `settings`, `audit`.

مصفوفة الصلاحيات الكاملة في **`lib/admin/rbac.ts`** (`roleMatrix`): لكل دور (`owner`, `admin`, `staff`, `customer`) ومستوى لكل وحدة (`full`, `limited`, `view`, `none`).

---

## 6. مجموعات التخطيط في `app/`

### 6.1 `(site)` — المتجر والمحتوى العام

| المسار | الغرض التقريبي |
|--------|----------------|
| `/` | الصفحة الرئيسية |
| `/shop` | قائمة المتجر (عميل: `ShopClient`) |
| `/shop/[slug]` | صفحة منتج (PDP) — بيانات من Supabase عبر `lib/storefront/pdp-data.ts` |
| `/cart` | السلة — `CartProvider` / Zustand مع ترحيل مخزن قديم |
| `/checkout` | إتمام الشراء |
| `/checkout/thank-you` | شكر بعد الطلب |
| `/checkout/paymob-response` | عودة من Paymob |
| `/account` | حساب المستخدم (محمي بالوسيط) |
| `/account/settings` | إعدادات الحساب |
| `/contact` | اتصال + نموذج يرسل إلى `/api/contact` |
| `/privacy`, `/terms` | صفحات قانونية |
| `/our-story`, `/our-cookies` | قصة العلامة / منتجاتنا |
| `/gift-ideas`, `/gift-box` | أفكار هدايا / صندوق هدايا |
| `/blog` | مدونة |
| `/search` | بحث |
| `/help/faq`, `/help/returns` | مساعدة |

### 6.2 `(admin)/admin` — لوحة التشغيل

| المسار | الوحدة (RBAC) |
|--------|----------------|
| `/admin` | `dashboard` |
| `/admin/products` | `products` |
| `/admin/orders` | `orders` |
| `/admin/customers` | `customers` |
| `/admin/discounts` | `discounts` |
| `/admin/reports` | `analytics` |
| `/admin/financial` | `financial` |
| `/admin/invoices` | `invoices` |
| `/admin/payments` | `payments` |
| `/admin/roles` | `roles` |
| `/admin/shipping` | `shipping` |
| `/admin/audit-logs` | `audit` |
| `/admin/settings` | `settings` |

واجهات الإدارة تستخدم غالبًا **TanStack Table** + **Zustand stores** تحت `stores/`.

### 6.3 `(auth)` — Clerk

- `/sign-in/[[...sign-in]]`
- `/sign-up/[[...sign-up]]`
- `/sso-callback`

### 6.4 صفحات عامة أخرى

- `/403` — ممنوع الوصول

---

## 7. واجهة الجذر `app/layout.tsx` (ملخص)

- **`ClerkProvider`** مع تعريب Clerk.
- **`ThemeProvider`**, **`LanguageProvider`**, **`MorphTransitionProvider`**
- خطوط Google متعددة (Playfair, Montserrat, Cairo, Tajawal, …) كـ CSS variables.
- **`ErrorBoundary`**, **`LokiBootstrap`** (تأثيرات)، **`LokiSvgFilters`**
- **`GA4Tracker`**، **`SiteJsonLd`** للـ SEO structured data
- قراءة كوكيز `LANG_COOKIE`, `THEME_COOKIE` من `lib/preferences/client-cookies`

---

## 8. قائمة مسارات API (`app/api/**/route.ts`)

> كل مسار أدناه هو `route.ts`؛ الطريقة الافتراضية غالبًا **GET** أو **POST** حسب الاسم والاستخدام.

### 8.1 Webhooks

| المسار | الوظيفة |
|--------|---------|
| `POST /api/webhooks/clerk` | مزامنة أحداث Clerk (تحقق Svix حيث يُطبَّق) |
| `POST /api/webhooks/paymob` | تحديث حالة الدفع عبر HMAC (`PAYMOB_HMAC_SECRET` في الكود) |

### 8.2 المتجر العام — منتجات وطلبات ودفع

| المسار | ملاحظات |
|--------|---------|
| `GET /api/products` | قائمة منتجات نشطة + فلاتر (Zod `productsQuerySchema`) |
| `GET /api/products/[slug]` | منتج واحد بالـ slug |
| `GET /api/products/search` | بحث |
| `POST /api/orders` | إنشاء طلب (Checkout) — تحقق Zod، حساب من السيرفر، اختياري **idempotency** عبر `idempotency_key` في الجسم أو رأس `Idempotency-Key` (UUID) مع عمود `checkout_idempotency_key` بعد ترحيل `0013`) |
| `GET /api/orders` | طلبات المستخدم الحالي (Clerk → `users`) |
| `GET/POST/PATCH… /api/orders/[id]` | تفاصيل طلب (حسب التنفيذ في الملف) |
| `POST /api/orders/[id]/cancel` | إلغاء طلب |
| `POST /api/checkout/paymob/intention` | إنشاء نية دفع Paymob + تسجيل الطلب مع `paymob_accept_order_id` |
| `POST /api/promo/validate` | التحقق من كود خصم |

### 8.3 الحساب والتفاعل

| المسار | ملاحظات |
|--------|---------|
| `GET/POST /api/wishlist` | قائمة أمنيات |
| `DELETE /api/wishlist/[productId]` | إزالة عنصر |
| `GET/POST /api/loyalty`, `referral`, `redeem` | ولاء وإحالات واستبدال |
| `POST /api/push/subscribe`, `POST /api/push/send` | Web Push |
| `POST /api/contact` | حفظ رسالة + إشعار بريد؛ حقل honeypot `_gotcha` |
| `POST /api/newsletter` | اشتراك؛ honeypot `_gotcha` |

### 8.4 Mr Brownie + Chat

| المسار | ملاحظات |
|--------|---------|
| `POST /api/mr-brownie/chat` | محادثة Gemini مع سياق السلة والدور |
| `POST /api/mr-brownie/ambient` | رسائل جوّية |
| `GET /api/mr-brownie/history` | سجل |
| `POST /api/mr-brownie/guest-session` | جلسة ضيف |
| `GET /api/chat/history` | سجل محادثة (مستخدم أو `sessionId` ضيف) |
| `POST /api/chat/save` | حفظ رسالة |
| `POST /api/chat/clear` | مسح |
| `POST /api/chat/handover` | نقل جلسة ضيف إلى مستخدم |

### 8.5 Gift Box

| المسار |
|--------|
| `/api/gift-box` |
| `/api/gift-box/[id]` |
| `/api/gift-box/[id]/add-to-cart` |
| `/api/gift-box/share/[token]` |

### 8.6 إشعارات داخلية

- `/api/notifications/order-status`
- `/api/notifications/order-confirmed`

### 8.7 حساب المستخدم

- `GET/POST /api/account/testimonials` — شهادات العملاء

### 8.8 Sanity

- `POST /api/sanity/webhook` — إعادة بناء/تحديث محتوى (توقيع webhook)

### 8.9 إدارة — تحت `/api/admin/*`

تتطلب عادة **`requireAdminAccess`** + **`requireWritePermission`** (أو ما يعادله) من `lib/admin/require-admin.ts`، وتسجيل تدقيق عبر `writeAuditLog` حيث يُنفَّذ.

أمثلة (غير شاملة لكل سطر في الملفات):

- `GET/POST /api/admin/products` — كتالوج
- `POST /api/admin/products/upload-image`
- `POST /api/admin/products/sync` — إعادة توليد كاش المتجر (`revalidatePath`) + رسالة توضيحية للمزامنة مع CMS
- `GET/POST/PATCH /api/admin/orders`, `.../orders/[id]`
- `GET /api/admin/customers`, `GET/PATCH /api/admin/customers/[id]`
- `GET/POST /api/admin/discounts`
- `GET/POST /api/admin/invoices` — إنشاء فاتورة (POST + Zod)
- `GET /api/admin/payments/summary`
- `GET /api/admin/financial/summary`, `.../financial/expenses/[id]`
- `GET /api/admin/reports/overview`
- `GET /api/admin/analytics`
- `GET/POST /api/admin/shipping-zones`, `reorder`, `[id]`
- `GET /api/admin/roles/matrix`
- `GET /api/admin/audit-logs`
- `GET /api/admin/settings/health`
- `POST /api/admin/push/broadcast` — بث (Web Push / VAPID؛ سلوك يعتمد على الإعداد)
- `POST /api/admin/product-assistant/chat` — مساعد منتجات
- `GET /api/admin/notifications/templates`

### 8.10 أدوات عامة

- `POST /api/revalidate` — غالبًا محمي بسر داخلي لإعادة التوليد

---

## 9. قاعدة البيانات (Supabase)

### 9.1 ملفات الترحيل (بالترتيب المنطقي للاسم)

| الملف | موضوع |
|--------|--------|
| `0001_init.sql` | `users`, `products`, `addresses`, `orders`, `order_items`, `contact_messages`, `newsletter_subscribers`, triggers, بداية RLS |
| `0002_orders_paymob.sql` | `paymob_accept_order_id` على الطلبات |
| `0003_v2_extend_schema.sql` | توسيع `orders`, `order_items`, رموز طلبات، ضيف، إلخ |
| `0004_audit_logs.sql` | سجل تدقيق الإدارة |
| `0005_phase_cde_foundations.sql` | أسس مرحلة C/D/E |
| `0006_customer_testimonials.sql` | شهادات |
| `0007_shipping_zones_sort_order.sql` | شحن |
| `0007_5_rls_helper_is_admin_or_owner.sql` | دالة `is_admin_or_owner()` |
| `0008_schema_alignment_and_security.sql` | محاذاة أعمدة، `payments`, `invoices`, سياسات RLS إضافية |
| `0009_orders_legacy_modern_sync.sql` | مزامنة أعمدة قديمة/حديثة للطلبات |
| `0010_phase_cde_compat_patch.sql` | توافق |
| `0011_mr_brownie_chat_history.sql` | سجل شات Mr Brownie |
| `0012_chat_messages.sql` | جدول `chat_messages` + تفعيل RLS |
| `0013_checkout_idempotency.sql` | `orders.checkout_idempotency_key` + فهرس فريد |
| `0014_chat_messages_rls.sql` | سياسات واضحة لـ `chat_messages` (service role / إدارة + قراءة المستخدم لصفوفه) |

### 9.2 كيانات أساسية (من `0001` + التوسعات)

- **`users`:** `clerk_user_id`, `email`, `full_name`, `role` (`owner|admin|staff|customer`), نقاط، إلخ.
- **`products`:** `slug`, أسعار، مخزون، `is_active`, حقول عنوان/وصف متعددة اللغة في ترحيلات لاحقة، صور، إلخ.
- **`orders` / `order_items`:** حالة الطلب، الدفع، Paymob، رسوم توصيل، خصومات، عنوان شحن JSON، **مفتاح إيدempotency** بعد `0013`.
- **`payments`, `invoices`:** مسارات مالية وإدارة فواتير (انظر `0008`).
- **`contact_messages`, `newsletter_subscribers`:** نماذج عامة.
- **`chat_messages`:** رسائل شات مؤسسي مع `session_id` و`user_id`.

> التطبيق يستخدم في السيرفر غالبًا **`createSupabaseAdminClient()`** (`SUPABASE_SERVICE_KEY`) لتجاوز RLS للعمليات الإدارية؛ RLS تبقى طبقة دفاع عند استخدام مفاتيح أخرى.

---

## 10. المتغيرات البيئية (مرجع)

### 10.1 مطلوبة في الإنتاج (من `assertProductionEnvOrWarn` / `REQUIRED_PROD_KEYS`)

| المتغير |
|---------|
| `NEXT_PUBLIC_APP_URL` |
| `APP_BASE_URL` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| `CLERK_SECRET_KEY` |
| `NEXT_PUBLIC_SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_KEY` |
| `PAYMOB_API_KEY` |
| `PAYMOB_HMAC` |
| `RESEND_API_KEY` |
| `RESEND_FROM_EMAIL` |
| `INTERNAL_API_SECRET` |

إضافي: **`COOKIE_BITE_PRIMARY_DOMAIN`** (دومين قانوني للوسيط)، و **`COOKIE_BITE_FAIL_ON_MISSING_ENV=true`** لإيقاف التشغيل عند النقص.

### 10.2 متغيرات شائعة أخرى في الكود

- **`PAYMOB_HMAC_SECRET`** — مستخدم في **`/api/webhooks/paymob`** (راجع توافق الاسم مع `PAYMOB_HMAC` في قائمة الإنتاج).
- مفاتيح Gemini لمسارات Mr Brownie (ابحث في `lib/mr-brownie` / `route.ts`).
- **`OWNER_BOOTSTRAP_EMAIL`** — بريد إشعارات التواصل الافتراضي في `app/api/contact/route.ts`.
- **`NEXT_PUBLIC_FREE_DELIVERY_THRESHOLD_EGP`** — عتبة توصيل مجاني في منطق الطلبات.

---

## 11. مخازن Zustand (`stores/`)

| الملف | الاستخدام التقريبي |
|--------|---------------------|
| `orders-operations-store.ts` | عمليات الطلبات في الإدارة |
| `products-dashboard-store.ts` | كتالوج الإدارة |
| `customers-crm-store.ts` | CRM |
| `financial-dashboard-store.ts` | لوحة مالية |
| `payments-console-store.ts` | مدفوعات |
| `shipping-orchestration-store.ts` | مناطق شحن وتنسيق |

---

## 12. مكوّنات الواجهة العامة (دليل تقريبي)

| المجلد | أمثلة |
|--------|--------|
| `components/layout/` | `site-header`, `site-footer`, `mobile-header`, `mobile-tab-bar`, شريط إعلان، قائمة |
| `components/shop/` | `shop-client`, `pdp-actions`, `pdp-shared-hero` |
| `components/product/` | `product-card`, `product-shared-image` (Next Image + layout مشترك) |
| `components/cart/` | شريط توصيل مجاني، مسح سلة بعد الطلب |
| `components/checkout/` | تدفق الدفع |
| `components/providers/` | `cart-provider`, `theme-provider`, `language-provider` |
| `components/contact/` | `contact-form` |
| `components/sections/` | أقسام الصفحة الرئيسية، نشرة بريدية، كاروسيل |
| `components/mr-brownie/` | ويدجت الشات العائم والمحادثة |
| `components/auth/` | مظهر Clerk، نماذج تسجيل |
| `components/seo/` | JSON-LD، مشاركة |
| `components/ui/` | أزرار، بطولات، سلايدر، تذييل |

---

## 13. تدفقات المستخدم الحرجة

1. **تصفح → منتج → سلة → Checkout:**  
   السلة في `CartProvider`؛ الأسعار والمخزون تُتحقق على السيرفر عند إنشاء الطلب وعند نية Paymob (`lib/checkout/resolve-line-items.ts`).

2. **الدفع بالبطاقة (Paymob):**  
   `POST /api/checkout/paymob/intention` → رابط iframe / payment key → عودة إلى `/checkout/paymob-response` → Webhook يحدّث `orders` عبر `updateOrderPaymentByPaymobAcceptOrderId` في `lib/db/orders.ts` مع **منع تكرار غير ضروري** عند تطابق `paymob_transaction_id` وحالة الدفع.

3. **الدفع عند الاستلام (COD):**  
   يمر عبر نفس مسار الطلب مع `payment_method: "cod"` وحالة مناسبة.

4. **الإدارة:**  
   Clerk + `resolveStaffRole` + RBAC → وحدات منفصلة مع جداول TanStack وجلب من `/api/admin/*`.

---

## 14. الاختبارات والجودة

| النوع | الموقع |
|--------|--------|
| **Jest** | `lib/__tests__/*`, `jest.config.mjs` — عتبات تغطية جزئية لـ `lib/validations/index.ts` |
| **Playwright** | `e2e/smoke.spec.ts` — صفحة رئيسية، `/api/products`, حماية `/admin`, honeypot لـ contact/newsletter |
| **Lint** | `eslint.config.mjs` — يتجاهل `.next`, `coverage`, `scripts` |

---

## 15. الأمان (ملخص تنفيذي)

- وسيط Next: **Rate limiting**, **حماية `/account`**, **RBAC للإدارة**, **قفل دومين الإنتاج**.
- نماذج عامة: **honeypot** `_gotcha` + حد معدل.
- طلبات الطلب: **Idempotency** اختيارية (UUID) لتجنب تكرار الطلبات.
- Webhooks: **HMAC / Svix** حسب المزوّد.
- CSP و HSTS في `next.config.ts` (وضع الإنتاج).

---

## 16. وثائق إضافية في المستودع

- `docs/RELEASE_CHECKLIST.md` — قائمة إطلاق (ترحيلات، بيئة، اختبارات، مراقبة).
- `docs/cookie-bite-admin-owner-master-plan.md` — مخطط إدارة (إن وُجد).
- `docs/website-complete-profile-ar.md` — ملف تعريفي بالعربية (قد يتداخل مع هذا المرجع).

---

## 17. كيفية تحديث هذا الملف

1. عند إضافة **صفحة** جديدة: حدّث القسم **6**.  
2. عند إضافة **`route.ts`**: حدّث القسم **8**.  
3. عند إضافة **ترحيل**: حدّث **9** و `RELEASE_CHECKLIST.md`.  
4. عند تغيير **RBAC** أو **الوسيط**: حدّث **5** و **10**.

---

*آخر بناء منطقي للمستند: يعكس شيفرة المشروع Cookie Bite (Next 16 + App Router).*
