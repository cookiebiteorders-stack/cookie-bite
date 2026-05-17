# Cookie Bite — خطة البنية التحتية والترقيات الشاملة

> **الإصدار:** مايو 2026  
> **النطاق:** `cookie-bite.com` — مستودع `cookie-bite` (Next.js 16 standalone على Hostinger)  
> **مراجع مرتبطة:** `docs/production-runbook-cookie-bite.com.md` · `docs/hostinger-production-cookie-bite.com-checklist.md` · `docs/cookie-bite-admin-owner-master-plan.md`

---

## 1) تقييم الوضع الحالي (Current State Assessment)

### 1.1 المكدس التقني (Stack)

| الطبقة | التقنية | الإصدار / الملاحظة |
|--------|---------|-------------------|
| Frontend / SSR | Next.js | `16.2.4` — `output: "standalone"` |
| UI | React | `19.2.4` |
| الاستضافة | Hostinger Node.js | Node `20+` — `hostinger.nodejs.json` |
| قاعدة البيانات | Supabase (PostgreSQL + RLS) | SDK `@supabase/supabase-js` `^2.105` |
| المصادقة | Clerk | `@clerk/nextjs` `^7.3` + webhooks Svix |
| الدفع | Paymob (Egypt) | intention + webhook HMAC |
| البريد | Resend | 23+ قالب، DNS موثّق على `cookie-bite.com` |
| CMS | Sanity | اختياري — مدونة + webhook revalidate |
| AI | Google Gemini | Mrs. Cookie (admin) + Mr. Brownie (storefront) |
| وسائط | Cloudinary | اختياري — رفع من `/api/admin/products/upload-image` |
| طابور | BullMQ + ioredis | اختياري عند `REDIS_URL`؛ بدونه DB queue + cron |
| WhatsApp | Meta Cloud API | اختياري — قوالب تأكيد الطلب/الدفع |
| PWA | `next-pwa` | مفعّل في الإنتاج، معطّل في التطوير |
| اختبارات | Jest + Playwright | CI: smoke E2E على `e2e/smoke.spec.ts` |

### 1.2 ما يُنشر فعلياً vs ما هو مُهيّأ في الكود

| المكوّن | مُنشر / يعمل | مُهيّأ في الكود فقط | ملاحظة |
|---------|--------------|---------------------|--------|
| تطبيق Next standalone | ✅ Hostinger `npm run start` → `server.mjs` | — | `postbuild` ينسخ `public/` و`.next/static` إلى standalone |
| Clerk auth + admin RBAC | ✅ عند اكتمال مفاتيح Clerk | — | `proxy.ts` + `lib/admin/rbac.ts` |
| Supabase (22 migration) | ⚠️ يعتمد على تنفيذ المايجريشنز | `supabase/migrations/0001`–`0021` | healthcheck عبر `npm run supabase:healthcheck` |
| Paymob checkout + webhook | ⚠️ يتطلب HMAC + integration IDs | `lib/paymob/*` | idempotency في `0013_checkout_idempotency.sql` |
| Resend transactional | ✅ DNS موثّق (حسب `docs/email-setup-guide.md`) | — | `npm run email:check` |
| إشعارات الطلب (email) | ⚠️ يتطلب cron Hostinger | DB queue `notification_jobs` + Bull اختياري | `POST /api/cron/notification-jobs` كل 5 دقائق |
| Gemini AI | ⚠️ تحذير عند غياب `GEMINI_API_KEY` | copilot + mr-brownie | ليس fail-fast |
| Sanity CMS | اختياري | blog + `/api/sanity/webhook` | |
| Redis/Bull | غالباً غير مفعّل على Hostinger | `lib/notifications/bull-queue.ts` | fallback تلقائي لـ DB |
| Cloudinary | غالباً غير مفعّل | رفع صور المنتجات | بدون env يفشل الرفع فقط |
| WhatsApp | اختياري | `lib/whatsapp/send.ts` | |
| مراقبة مركزية | console + webhook اختياري | `logStructuredError` + `COOKIE_BITE_LOG_WEBHOOK_URL` | لا Sentry/OTel SDK بعد |
| CI GitHub Actions | ✅ على كل push/PR | `.github/workflows/ci.yml` | **لا يوجد** deploy تلقائي إلى Hostinger |
| PWA + CSP + HSTS | ✅ في الإنتاج | `next.config.ts` | CSP تسمح Clerk/Supabase/Cloudinary |

### 1.3 قفل الإنتاج (`production-lock.ts`)

**18 مفتاحاً إلزامياً** في `REQUIRED_PROD_KEYS` + `PAYMOB_HMAC_SECRET` (أو legacy `PAYMOB_HMAC`):

- App: `NEXT_PUBLIC_APP_URL`, `APP_BASE_URL`
- Clerk: publishable + secret + `CLERK_WEBHOOK_SIGNING_SECRET`
- Supabase: URL + anon + `SUPABASE_SERVICE_KEY`
- Paymob: API key + card/wallet integration IDs + HMAC
- Resend: API key + `RESEND_FROM_EMAIL`
- داخلي: `INTERNAL_API_SECRET`, `REVALIDATE_SECRET`

**سلوك الإقلاع:**

- `COOKIE_BITE_FAIL_ON_MISSING_ENV=false` (افتراضي): تحذير `console.error` والمتابعة — **هذا يفسر HTTP 200 مع تكاملات معطّلة جزئياً**.
- `COOKIE_BITE_FAIL_ON_MISSING_ENV=true`: إيقاف العملية (`server.mjs` + `assertProductionEnvOrWarn`).

**تجميعات التكامل** (`INTEGRATION_ENV_GROUPS`): تُعرض في `GET /api/admin/settings/health` مع فحص جداول DB و`is_admin_or_owner()`.

### 1.4 حالة الإنتاج المعروفة (مايو 2026)

| المؤشر | الحالة |
|--------|--------|
| الموقع يعيد `200` على `/` | ✅ مؤكد |
| فحص DB (`supabase:healthcheck`) | ✅ OK عند اكتمال الاتصال |
| مفاتيح Hostinger الناقصة | ⚠️ **غالباً 6** من القائمة أعلاه (تتكرر: `INTERNAL_API_SECRET`, `REVALIDATE_SECRET`, `CLERK_WEBHOOK_SIGNING_SECRET`, `PAYMOB_HMAC_SECRET`, integration IDs، أو `RESEND_FROM_EMAIL`) — تحقق بـ `npm run hostinger:env-audit` |
| Cron الإشعارات | ⚠️ يجب التأكد يدوياً في hPanel |
| Clerk webhook | ⚠️ يتطلب URL + signing secret في لوحة Clerk |
| Fail-fast | موصى به **بعد** اكتمال كل المفاتيح |

### 1.5 إصلاحات بنية حديثة (مرجعية)

1. **`server.mjs`**: يحل مسار standalone (`cwd` أو `.next/standalone`) ويحذّر من غياب `public/` / `.next/static`.
2. **`scripts/copy-standalone-assets.mjs`**: postbuild ينسخ الأصول — بدونه أخطاء 503/static على Hostinger.
3. **نظام الإشعارات**: `0017_notification_logs` + `0018_notification_jobs` — orchestrator يختار Bull ثم DB ثم `after()`.
4. **RLS**: `0007_5` قبل `0008` إلزامي؛ تقرير `docs/db-security-audit-2026-05-12.md`.

### 1.6 فجوات المنتج (من master plan الإدارة)

مرجع: `docs/cookie-bite-admin-owner-master-plan.md` — Phases A–E:

- BI متقدم، تقارير مالية P&L، فواتير credit notes/B2B
- CRM (segmentation, CLV, churn)
- شحن متقدم (couriers خارجيون)
- GDPR tooling، observability dashboards

**صفحات admin موجودة:** orders, products, customers, payments, financial, invoices, reports, shipping, discounts, cms, template-library, audit-logs, copilot, settings/health.

---

## 2) خارطة طريق البنية التحتية (P0 → P4)

### P0 — استقرار الإنتاج (أسبوع 1–2) — أولوية قصوى

| البند | الإجراء | معيار القبول |
|-------|---------|--------------|
| متغيرات Hostinger | `npm run hostinger:env-audit` → استيراد `hostinger-production.env` | `hostinger:checklist` يُظهر `Missing locally: none` |
| Fail-fast تدريجي | بعد الاكتمال: `COOKIE_BITE_FAIL_ON_MISSING_ENV=true` | إعادة النشر لا تبدأ بتكاملات ناقصة |
| المايجريشنز | `npm run supabase:ensure-schema` (يتطلب `SUPABASE_ACCESS_TOKEN`) | health admin: `database.ok` |
| Cron | hPanel: كل 5 دقائق `POST .../api/cron/notification-jobs?limit=20` + `x-internal-secret` | صفوف `notification_jobs` تنتقل إلى `completed` |
| Clerk webhook | `https://cookie-bite.com/api/webhooks/clerk` + signing secret | مستخدم جديد يظهر في `users` |
| Paymob webhook | `https://cookie-bite.com/api/webhooks/paymob` + HMAC | طلب تجريبي يحدّث `payments` |
| Smoke يدوي | قسم 3 من production runbook | checklist §8 |

### P1 — أمان ومراقبة أساسية (أسبوع 3–4)

| البند | التفاصيل |
|-------|----------|
| أسرار | تدوير `INTERNAL_API_SECRET`, `REVALIDATE_SECRET`, Paymob HMAC — جدولة ربع سنوية |
| Webhook logging | ضبط `COOKIE_BITE_LOG_WEBHOOK_URL` (HTTPS) — Zapier/Datadog/Discord |
| Uptime | Hostinger uptime أو Better Uptime على `/`, `/api/products`, `/sign-in` |
| CI secrets | إضافة `SUPABASE_ACCESS_TOKEN` + `NEXT_PUBLIC_SUPABASE_URL` في GitHub لتمكين فحوصات DB دائماً |
| RLS regression | توسيع `supabase-security-check.mjs` في CI (موجود جزئياً) |
| CSP | مراجعة `connect-src` عند إضافة مراقبة أو CDN جديد |

### P2 — تحسين البنية (شهر 2)

#### Hosting (Hostinger Node.js)

| الموضوع | التوصية |
|---------|---------|
| Cron | Hostinger cron فقط لـ notification-jobs حالياً — لا cron مدمج لمهام أخرى |
| SSL | مفعّل على `cookie-bite.com` — إضافة redirect `www` → apex إن لزم |
| Standalone | الإبقاء على `output: "standalone"` + `server.mjs` — لا تراجع لـ `next start` بدون standalone |
| Scaling | حدود Hostinger Node (ذاكرة/عملية واحدة) — عند نمو الحمل: Redis خارجي + مراقبة CPU أو ترحيل جزئي (مثلاً static على CDN) |
| Env | كل المتغيرات في hPanel — لا ملف `.env` على القرص في الإنتاج |
| Deploy | Git integration Hostinger **أو** رفع يدوي بعد `npm ci && npm run build` محلياً للتحقق |

#### Database (Supabase)

| الموضوع | التوصية |
|---------|---------|
| Migrations | 22 ملفاً — تنفيذ ترتيبي؛ لا drop جداول حية عند حادثة |
| RLS | إبقاء `is_admin_or_owner()`؛ مراجعة قراءة `notification_templates` العامة |
| Backups | تفعيل PITR على Supabase Pro إن أمكن؛ تصدير أسبوعي للجداول الحرجة |
| Pooling | Supavisor connection pooler لمسارات serverless كثيفة — مراقبة `max connections` |
| Read replicas | **لاحقاً** — عند تقارير admin ثقيلة فقط |
| Legacy columns | migration إزالة أعمدة `orders` القديمة بعد اكتمال الكود على الأعمدة الحديثة |

#### CDN / Media (Cloudinary)

| الوضع الحالي | التوصية |
|--------------|---------|
| `next/image` + Unsplash + Sanity CDN | الإبقاء للمحتوى الثابت |
| Cloudinary اختياري | تفعيل عند رفع صور منتجات كثيف: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| PWA cache | `next.config.ts` يخزّن `res.cloudinary.com` — متسق مع التفعيل |
| بديل | Supabase Storage + transforms — جهد أكبر، تكلفة أقل عند حجم صغير |

#### Queue (Redis/Bull vs DB + cron)

```
طلب جديد → scheduleNotification()
    ├─ REDIS_URL موجود؟ → BullMQ (3 محاولات، exponential backoff)
    └─ لا → notification_jobs (DB) + after() فوري + cron كل 5 دقائق
```

| السيناريو | التوصية |
|-----------|---------|
| حجم منخفض–متوسط | **الإبقاء على DB + cron** — أبسط على Hostinger |
| تأخير email > 5 دقائق غير مقبول | Upstash Redis + `REDIS_URL` — لا Redis محلي على Hostinger |
| مهام مستقبلية (تقارير، bulk) | Bull worker منفصل أو Inngest — **P3+** |

#### Email (Resend)

- DNS: SPF/DKIM/DMARC مكتمل (راجع `docs/email-setup-guide.md`)
- `npm run email:check` بعد كل تغيير DNS
- `RESEND_FROM_EMAIL` على صندوق موثّق (`orders@cookie-bite.com`)
- DMARC `p=quarantine` — راقب `rua` reports

#### Auth (Clerk production hardening)

- مفاتيح **production** (ليس dev keys)
- نطاق أساسي `cookie-bite.com` فقط في redirects
- Webhook signing: `CLERK_WEBHOOK_SIGNING_SECRET` (ليس `CLERK_WEBHOOK_SECRET`)
- ربط `resolveStaffRoleFromEmail` لأدوار admin/owner
- MFA للمالكين — من لوحة Clerk

#### Payments (Paymob)

- إكمال: card + wallet integrations، HMAC موحّد، return URL
- اختبار webhook مكرر (idempotency `0013`)
- **مستقبلي (P4):** abstraction layer لـ Stripe/Fawry — `docs/cookie-bite-admin-owner-master-plan.md` Phase E

#### Observability

| الآن | التالي |
|------|--------|
| `logStructuredError` + console | ربط webhook |
| لا `instrumentation.ts` | Sentry Next.js SDK **أو** OTel → نفس payload JSON |
| لا tracing | `correlationId` في checkout/webhooks موجود — توسيع الاستخدام |
| health endpoint | `/api/admin/settings/health` — إضافة تنبيه عند `env.ok === false` |

#### CI/CD

```
GitHub push/PR → ci.yml (lint, type-check, test, build, e2e smoke, supabase*)
       ↓ (يدوي اليوم)
Hostinger Git deploy أو redeploy → npm run build → npm run start
```

**توصية P2:** workflow `deploy-hostinger.yml` (workflow_dispatch) يشغّل build + يرسل artifact — أو webhook Hostinger من branch `main` فقط.

#### Security

| البند | الحالة | إجراء |
|-------|--------|-------|
| Env fail-fast | اختياري | تفعيل بعد P0 |
| Rate limit | `proxy.ts` | مراجعة حدود `/api/checkout`, `/api/orders` |
| WAF | Hostinger | تفعيل قواعد أساسية anti-bot |
| CSP | إنتاج | اختبار بعد كل تكامل خارجي جديد |
| Secrets | — | لا commit لـ `.env`؛ `hostinger-production.env` في `.gitignore` |

### P3 — قدرات تشغيلية (شهر 2–3)

- Redis (Upstash) للإشعارات الفورية
- Cloudinary للمنتجات
- WhatsApp transactional عند الموافقة على القوالب
- توسيع audit logs على كل mutations الإدارية (Phase A)
- Dashboard widgets (Phase B)

### P4 — نضج ونطاق (شهر 3+)

- بوابات دفع إضافية
- read replicas / تقارير ثقيلة
- GDPR export/delete
- multi-region أو CDN أمام Hostinger عند ضغط عالمي
- فريق ops: Grafana/Datadog كامل

---

## 3) ترقيات التطبيق (Application Upgrades)

### 3.1 ترقية التبعيات

| الحزمة | الحالي | المخاطر | التوصية |
|--------|--------|---------|---------|
| Next.js | 16.2.4 | متوسطة — breaking في caching APIs | ترقية patch شهرياً؛ minor بعد قراءة changelog |
| React | 19.2.4 | منخفضة مع Next 16 | متزامن مع Next |
| Clerk | 7.3.x | متوسطة — webhook/middleware | اختبار sign-in + admin بعد كل ترقية |
| Supabase SDK | 2.105 | منخفضة | ترقية دورية |
| BullMQ / ioredis | 5.x / 5.x | منخفضة | فقط إن فُعّل Redis |
| Zod | 4.x | متوسطة — تحقق schemas | `npm run type-check` إلزامي |
| next-pwa | 5.6 | متوسطة — قد يتأخر مع Next major | راقب issues قبل Next 17 |

**عملية آمنة:** فرع `chore/deps-*` → CI كامل → deploy staging إن وُجد → إنتاج.

### 3.2 الأداء (Performance)

| المجال | الوضع | تحسين مقترح |
|--------|-------|-------------|
| ISR / cache | `revalidateTag` + `Cache-Control` على `/api/products` | tags موحّدة للكتالوج؛ webhook Sanity يستدعي `/api/revalidate` |
| صور | `next/image` AVIF/WebP + remotePatterns | تفعيل Cloudinary transforms للمنتجات |
| Core Web Vitals | GSAP/motion/three على الصفحة الرئيسية | `prefers-reduced-motion`؛ lazy load Three |
| API | rate limit في proxy | ضبط حسب مراقبة 429 |
| DB | استعلامات admin | فهارس على `orders.created_at`, `notification_jobs(status, scheduled_at)` موجودة |

### 3.3 PWA

- مفعّل: `register: true`, `skipWaiting: true`
- runtime caching لـ static, Cloudinary, Sanity, `/api/products`
- **تحقق:** manifest + أيقونات في `public/`؛ Lighthouse PWA audit بعد كل إصدار كبير
- **iOS:** اختبار Add to Home Screen يدوياً

### 3.4 اكتمال الميزات (Feature Gaps)

مرتبطة بـ Phases في `cookie-bite-admin-owner-master-plan.md`:

| Phase | أولوية | جهد |
|-------|--------|-----|
| A — Foundation (audit, enums, production sync) | عالية | S–M |
| B — Core Admin UX (dashboard, kanban orders) | عالية | L |
| C — Commerce intelligence (loyalty, cohorts) | متوسطة | L |
| D — Financial/compliance | متوسطة | L |
| E — Scale (shipping orchestration, gateways) | منخفضة | XL |

---

## 4) دليل التشغيل (Operational Runbooks)

### 4.1 فحوصات يومية (5–10 دقائق)

- [ ] الموقع `/` و`/shop` — HTTP 200
- [ ] `GET /api/admin/settings/health` (حساب admin) — `env.ok`, `database.ok`
- [ ] سجلات Hostinger — أخطاء `production env missing`
- [ ] طابور `notification_jobs` — لا تراكم `pending` > 1 ساعة
- [ ] Resend dashboard — bounce/spam spike

### 4.2 فحوصات أسبوعية

- [ ] `npm run email:check`
- [ ] `npm run supabase:healthcheck` (من جهة آمنة)
- [ ] مراجعة `audit_logs` لأحداث غير متوقعة
- [ ] Clerk — محاولات فاشلة / نشاط غريب
- [ ] Paymob — معدل webhook failures
- [ ] GitHub Actions — فشل CI متكرر
- [ ] نسخة احتياطية Supabase (تأكيد من اللوحة)

### 4.3 الاستجابة للحوادث (Incident Response)

| العرض | التشخيص | إجراء فوري |
|-------|---------|------------|
| 503 / static مفقود | غياب `public` في standalone | إعادة `npm run build` + تحقق postbuild |
| Auth لا يعمل | Clerk keys / domain | تحقق publishable + redirects |
| Admin 403 | دور email | `resolveStaffRoleFromEmail` + Clerk email |
| دفع لا يُحدّث | Paymob HMAC / webhook | سجلات `logStructuredError` + إعادة إرسال webhook |
| بريد لا يُرسل | Resend / cron | `notification_jobs` + cron header |
| DB فارغ في admin | RLS / migration | `supabase:ensure-schema` + `0007_5` قبل `0008` |

**Rollback:** Hostinger → commit سابق؛ **لا** drop جداول DB.

### 4.4 playbook الترحيل (Migration Playbook)

1. نسخ احتياطي Supabase (point-in-time إن متاح)
2. `npm run supabase:list-migrations` — مقارنة مع المنفّذ
3. `npm run supabase:migrate` أو `supabase:ensure-schema`
4. `node scripts/supabase-security-check.mjs`
5. `node scripts/supabase-schema-snapshot-check.mjs`
6. smoke يدوي (orders, payments, chat إن مُستخدم)
7. مراقبة ساعة أولى

### 4.5 قائمة Cron على Hostinger

| الجدولة | الطريقة | URL / الأمر | Headers |
|---------|---------|-------------|---------|
| كل **5 دقائق** | HTTP POST | `https://cookie-bite.com/api/cron/notification-jobs?limit=20` | `x-internal-secret: <INTERNAL_API_SECRET>` |

**مهام لا cron لها حالياً** (تعمل عبر webhooks أو `after()`):

- Clerk sync → webhook
- Paymob → webhook
- Sanity → `POST /api/revalidate` عند النشر

**مستقبلي:** cron تنظيف `notification_jobs` القديمة، تقارير ليلية — **P3**.

---

## 5) مصفوفة التكلفة والأولوية

| البند | الأثر | الجهد | الأولوية | المرحلة |
|-------|-------|-------|----------|---------|
| إكمال 6 env keys على Hostinger | عالي | S | P0 | الآن |
| تفعيل cron الإشعارات | عالي | S | P0 | الآن |
| `COOKIE_BITE_FAIL_ON_MISSING_ENV=true` | عالي | S | P0 | بعد env |
| تنفيذ كل migrations | عالي | M | P0 | أسبوع 1 |
| `COOKIE_BITE_LOG_WEBHOOK_URL` | متوسط | S | P1 | أسبوع 3 |
| GitHub Supabase secrets في CI | متوسط | S | P1 | أسبوع 3 |
| Uptime monitoring | متوسط | S | P1 | أسبوع 3 |
| Sentry SDK | متوسط | M | P2 | شهر 2 |
| Upstash Redis | متوسط | M | P2–P3 | عند الحاجة |
| Cloudinary تفعيل | متوسط | S | P2 | عند رفع صور |
| Deploy workflow GitHub→Hostinger | متوسط | M | P2 | شهر 2 |
| Phase A admin hardening | عالي | M | P2 | شهر 2 |
| Phase B dashboard | عالي | L | P3 | شهر 2–3 |
| Read replicas | منخفض | L | P4 | لاحقاً |
| بوابة دفع ثانية | منخفض | XL | P4 | لاحقاً |

**وسم الجهد:** S = 1–2 أيام · M = 3–7 أيام · L = 2–4 أسابيع · XL = شهر+

---

## 6) الجدول الزمني المقترح (30 / 60 / 90 يوم)

### أول 30 يوم — «إنتاج موثوق»

| الأسبوع | معالم |
|---------|-------|
| 1 | env audit كامل؛ cron؛ migrations؛ Clerk + Paymob webhooks |
| 2 | fail-fast؛ smoke commerce كامل؛ `email:check` |
| 3 | log webhook؛ uptime؛ CI secrets؛ توثيق rollback |
| 4 | مراجعة أمنية RLS؛ Phase A (audit logs على endpoints حرجة) |

### 60 يوم — «تشغيل + أداء»

| الأسبوع | معالم |
|---------|-------|
| 5–6 | Sentry أو OTel؛ تحسين cache/tags؛ Lighthouse |
| 7–8 | Phase B dashboard أساسي؛ Cloudinary إن لزم؛ Redis قرار نهائي |

### 90 يوم — «نمو وذكاء»

| الأسبوع | معالم |
|---------|-------|
| 9–10 | Phase C analytics أولية؛ WhatsApp إن معتمد |
| 11–12 | Phase D financial تقارير؛ خطة legacy columns removal؛ مراجعة تكلفة Hostinger vs بدائل |

---

## 7) أوامر مرجعية سريعة

```bash
npm run hostinger:env-audit
npm run hostinger:checklist
npm run supabase:healthcheck
npm run supabase:ensure-schema
npm run email:check
npm run type-check && npm run lint && npm run test && npm run build
```

---

## 8) ملخص تنفيذي

Cookie Bite **جاهز تقنياً** كتطبيق Next standalone مع تكاملات كاملة في الكود، لكن **الإنتاج على Hostinger** يعتمد على إغلاق فجوة متغيرات البيئة (~6 مفاتيح)، cron الإشعارات، وwebhooks Clerk/Paymob. البنية الحالية **تفضّل البساطة**: DB queue + cron بدلاً من Redis؛ Cloudinary وWhatsApp اختياريان. الأولوية: **P0 استقرار** → **P1 مراقبة** → **P2 تحسين بنية** → **Phases A–E للمنتج** على 90 يوماً.

---

*آخر تحديث: يُحدَّث مع كل إصدار إنتاجي — راجع `git log` و`docs/production-runbook-cookie-bite.com.md`.*
