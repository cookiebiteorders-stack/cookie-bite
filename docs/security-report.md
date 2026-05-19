# Cookie Bite — تقرير الفحص الأمني الشامل

**التاريخ:** 19 مايو 2026  
**النطاق:** كامل التطبيق (Frontend + Backend + قواعد البيانات + الإعدادات)  
**النتيجة العامة:** 🟠 **يحتاج إجراءات فورية** — تم اكتشاف مفاتيح حساسة مكشوفة، تبعيات بثغرات HIGH، وبعض ثغرات في كود الـ API.

---

## ١) ملخص تنفيذي

| الفئة | عدد المشاكل | الشدّة |
|---|---|---|
| تسريب مفاتيح في `.env` | 18+ مفتاح حيّ | 🔴 CRITICAL |
| ثغرات في `next.js@16.2.4` | 13 (6 HIGH) | 🔴 HIGH |
| PostgREST filter injection | 4 endpoints | 🟠 HIGH |
| `unsafe-inline` في CSP | 1 (نطاق script-src) | 🟡 MEDIUM |
| Rate limiting في الذاكرة فقط | لا يصمد متعدد الـ instances | 🟡 MEDIUM |
| لا يوجد نظام نسخ احتياطي | الـ Backend بدون backup | 🟠 HIGH |
| بريد + كلمة سر مالك في `.env` | `OWNER_BOOTSTRAP_PASSWORD` | 🔴 CRITICAL |

تم **إصلاح** ما يلي ضمن هذه الجلسة (تعديلات الكود):

- ✅ تأمين كل استعلامات `.or()` ضد PostgREST filter injection.
- ✅ نقل سرّ `/api/revalidate` من query إلى Header مع `timingSafeEqual`.
- ✅ إضافة headers أمان جديدة (COOP, CORP, X-Permitted-Cross-Domain-Policies).
- ✅ توسعة `Permissions-Policy` لإيقاف ميزات غير مستخدمة.
- ✅ Rate limit عام إضافي + cleanup للذاكرة.
- ✅ أدوات نسخ احتياطي + استرجاع + فحص أمني + خطة تدوير مفاتيح.

ما يلزم **منك** يدوياً (لا يمكن للكود أن يفعله):

1. **تدوير كل المفاتيح في `.env`** الآن — اعتبرها مكشوفة.
2. ترقية `next.js` لأحدث 16.x مع المعالجة الأمنية.
3. تشغيل `npm audit fix` ثم اختبار البناء.
4. إعداد نسخ احتياطي مجدول (cron) لـ Supabase.

---

## ٢) المخاطر التفصيلية والإصلاحات

### 2.1 🔴 CRITICAL — مفاتيح حية في `.env`

#### الواقع
ملف `.env` يحتوي على مفاتيح **إنتاجية**:

```
SUPABASE_SERVICE_KEY=eyJhbGciOi...       # وصول كامل للـ DB يتجاوز RLS
CLERK_SECRET_KEY=sk_test_6M0HH9ubqd...   # يمكنه إنشاء/تعديل/حذف أي مستخدم
RESEND_API_KEY=re_LSBAj2Kz_...           # إرسال بريد باسم cookie-bite.com
GEMINI_API_KEY / GOOGLE_GEMINI_API_KEY   # فاتورة Google تذهب لمشروعك
GOOGLE_CLOUD_API_KEY / CLIENT_SECRET     # وصول لخدمات Google Cloud
SANITY_API_TOKEN                         # يعدّل المحتوى
CLOUDINARY_API_SECRET                    # رفع/حذف صور
OPENAI_API_KEY=sk-proj-...               # رصيد مدفوع
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...     # وصول للريبوهات
HOSTINGER_API_TOKEN                      # تحكّم في الاستضافة
VAPID_PRIVATE_KEY                        # توقيع إشعارات Push
REVALIDATE_SECRET                        # إبطال cache Next.js
OWNER_BOOTSTRAP_PASSWORD=Cookieforever... # كلمة سر المالك ✗
```

#### الخطر
- أي طرف ثالث (بما فيه مساعد IDE) رأى المحادثة لديه نسخة من هذه المفاتيح.
- `SUPABASE_SERVICE_KEY` يتجاوز كل سياسات RLS — قراءة/كتابة/حذف لأي شيء.
- `OWNER_BOOTSTRAP_PASSWORD` نص صريح في ملف لا يجب أن يحتوي كلمة سر أبداً.

#### الإصلاح (يدوي)

```bash
# 1) شغّل خطة التدوير
npm run security:rotate-plan

# 2) لكل مفتاح، افتح لوحة المزوّد، أنشئ مفتاحاً جديداً وألغِ القديم.
# 3) ضع المفاتيح الجديدة في:
#    - .env (محلي)
#    - hPanel → Environment variables (الإنتاج)
#    - GitHub Actions secrets (إن وُجدت)

# 4) احذف OWNER_BOOTSTRAP_PASSWORD من .env بالكامل — لا يجب وجوده.
```

> **ملاحظة:** الـ `.env` غير مدرج في git history (تحقّقنا). لكن أي شخص شاهد محتواه يجب أن يُعتبر يمتلكه.

### 2.2 🔴 HIGH — ثغرات `next.js@16.2.4`

نتيجة `npm audit`:

| CVE | شدة | الوصف |
|---|---|---|
| GHSA-26hh-7cqf-hhc6 | HIGH | Middleware/Proxy bypass via segment-prefetch |
| GHSA-492v-c6pp-mqqv | HIGH | Middleware bypass via dynamic route param injection |
| GHSA-267c-6grr-h53f | HIGH | Middleware bypass (segment-prefetch incomplete fix) |
| GHSA-c4j6-fc7j-m34r | HIGH | SSRF via WebSocket upgrades |
| GHSA-ffhc-5mcf-pf4q | MEDIUM | XSS via CSP nonces |
| GHSA-3g8h-86w9-wvmq | MEDIUM | Cache poisoning في redirects |
| GHSA-h64f-5h5j-jqjh | MEDIUM | DoS في Image Optimization API |
| GHSA-8h8q-6873-q5fj | MEDIUM | DoS في Server Components |
| GHSA-gx5p-jg67-6x7h | MEDIUM | XSS في beforeInteractive scripts |
| ... | ... | (المزيد) |

**Middleware bypass** خطير جداً لأن `proxy.ts` هو الذي يفرض RBAC على `/admin`.

#### الإصلاح

```bash
# تحقق من أحدث إصدار 16.x مع الترقيع
npm view next dist-tags
npm install next@latest

# اختبار شامل بعد الترقية
npm run type-check
npm run lint
npm run build
npm test
```

### 2.3 🟠 HIGH — PostgREST Filter Injection (تم الإصلاح)

#### الواقع
```ts
// قبل:
db = db.or(`slug.ilike.%${q}%,name.ilike.%${q}%`);
// المستخدم يكتب: "', is_active.eq.false ,'"
// يُولّد: slug.ilike.%', is_active.eq.false ,'%
// PostgREST يفسّر هذا كـ clauses إضافية!
```

أمثلة الاستغلال المحتملة:
- إضافة شرط يكشف صفوف غير مرئية.
- التحايل على فلاتر `is_active = true`.

#### الإصلاح (مُطبَّق)

أضفت `lib/security/sanitize-filter.ts` ثم بدّلت كل المواضع:

```ts
import { buildIlikeOrClause } from "@/lib/security/sanitize-filter";

if (search?.trim()) {
  const clause = buildIlikeOrClause(["slug", "name", "sku", "category"], search);
  if (clause) db = db.or(clause);
}
```

التغطية:
- `app/api/admin/products/route.ts` ✅
- `app/api/admin/orders/route.ts` ✅
- `app/api/admin/customers/route.ts` ✅
- `lib/admin/copilot/tools.ts` ✅

### 2.4 🟡 MEDIUM — `/api/revalidate` يقبل السر في URL (تم الإصلاح)

#### الواقع
```ts
// قبل:
const secret = req.nextUrl.searchParams.get("secret");
// السر يظهر في:
// - access logs على Hostinger / Cloudflare
// - Referer headers
// - browser history
```

#### الإصلاح (مُطبَّق)

```ts
// app/api/revalidate/route.ts
const headerSecret = req.headers.get("x-revalidate-secret");
if (!isValidSecret(headerSecret)) return 401;
// مع timingSafeEqual بدلاً من ===
```

تأكد أن أي خدمة تستدعي `/api/revalidate` تستخدم:
```
POST /api/revalidate
x-revalidate-secret: <SECRET>
Content-Type: application/json
{ "tag": "products" }
```

### 2.5 🟡 MEDIUM — CSP يسمح بـ `unsafe-inline` للسكربتات

#### الواقع
```ts
"script-src 'self' 'unsafe-inline' cdn.jsdelivr.net ..."
```

`'unsafe-inline'` يبطل حماية CSP ضد XSS. السبب الحالي: Next.js يحقن inline scripts للـ hydration.

#### الإصلاح (موصى به)

الحل الأنسب في Next.js 15+/16 هو **استخدام nonces**:

```ts
// proxy.ts
import { NextResponse } from "next/server";
import crypto from "node:crypto";

export default function (request) {
  const nonce = crypto.randomBytes(16).toString("base64");
  const csp = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ...`;
  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("x-nonce", nonce);
  return res;
}
```

ثم في `app/layout.tsx`:
```tsx
import { headers } from "next/headers";
const nonce = (await headers()).get("x-nonce");
<Script nonce={nonce} ... />
```

أُجلّ التنفيذ لأن يحتاج اختبار شامل مع Clerk و Sanity و PWA.

### 2.6 🟠 HIGH — Rate Limiting في الذاكرة (تم تخفيف الأثر)

#### الواقع
`proxy.ts` يستخدم `Map<string, ...>` في الذاكرة:
- يضيع بعد كل deploy / restart.
- لا يعمل عبر instances متعدّدة (لكن Hostinger يعمل instance واحد حالياً).
- يمكن لاعتداء DoS أن يستهلك الذاكرة (تم الإصلاح بإضافة cleanup دوري).

#### الإصلاح طويل المدى (موصى به)

استخدم **Upstash Redis** أو **Vercel KV** (مجاناً حتى ~10k req/يوم):

```ts
// lib/security/rate-limit.ts
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = Redis.fromEnv();
export const rl = {
  pay: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(8, "60s") }),
  form: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(5, "60s") }),
  // ...
};
```

```bash
npm install @upstash/redis @upstash/ratelimit
```

### 2.7 🟠 HIGH — لا يوجد نظام نسخ احتياطي (تم الحل)

#### الإصلاح (مُطبَّق)

أضفت سكربتين:

```bash
# نسخة احتياطية كاملة لكل جداول Supabase (NDJSON.gz + sha256)
npm run backup:supabase

# يحفظ في backups/supabase-<ISO timestamp>/
# مع metadata.json + SHA256SUMS.txt

# لاستعادة (احذر — يطلب --confirm-prod للإنتاج)
npm run backup:supabase:restore -- --from=backups/supabase-2026-...
```

**مهم:** اجعل النسخة الاحتياطية مجدولة:

#### خيار 1 — Windows Task Scheduler
```powershell
# كل ليلة 3 صباحاً
schtasks /create /tn "CookieBite-Backup" /tr "node C:\path\to\scripts\supabase-backup.mjs" /sc daily /st 03:00
```

#### خيار 2 — GitHub Actions cron (الأفضل — خارج السيرفر)
```yaml
# .github/workflows/backup.yml
name: Supabase Backup
on:
  schedule: [{ cron: "0 2 * * *" }]
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: node scripts/supabase-backup.mjs --out=backups
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - uses: actions/upload-artifact@v4
        with:
          name: supabase-backup-${{ github.run_id }}
          path: backups/
          retention-days: 30
```

#### خيار 3 — Supabase PITR (الأقوى)
في لوحة Supabase Dashboard → Settings → Database → Point-in-time recovery:
- يحفظ نسخة كل WAL تلقائياً.
- يكلف ~25$/شهر لكن أفضل حماية ضد الحذف العَرَضي.

---

## ٣) جداول الفحص حسب نوع الهجوم

### 3.1 OWASP Top 10

| # | الهجوم | الوضع | التفاصيل |
|---|---|---|---|
| A01 | Broken Access Control | 🟢 جيد | RBAC في `lib/admin/require-admin.ts` + Clerk. **تنبيه:** متأثر بثغرات Next.js Middleware bypass — رقّع Next.js. |
| A02 | Cryptographic Failures | 🟠 ضعيف | كلمة سر المالك في `.env` بنص صريح. مفاتيح خدمة في الـ env (طبيعي لكن يجب تدويرها). |
| A03 | Injection | 🟢 جيد بعد الإصلاح | لا SQL مباشر (يستخدم PostgREST). أصلحنا PostgREST filter injection. |
| A04 | Insecure Design | 🟡 وسط | لا CSRF tokens (يعتمد على SameSite=Lax من Clerk). يحتاج تأكيد. |
| A05 | Security Misconfiguration | 🟡 وسط | CSP يحتوي `unsafe-inline`. أضفنا COOP/CORP. |
| A06 | Vulnerable Components | 🔴 سيء | 13 ثغرة في `npm audit` (6 HIGH). يحتاج `npm audit fix` فوراً. |
| A07 | Auth Failures | 🟢 جيد | Clerk مع 2FA متاح. تحقق سرّ webhook عبر svix. |
| A08 | Software/Data Integrity | 🟢 جيد | كل webhook (Clerk/Paymob/Sanity) يتحقق HMAC/signature. |
| A09 | Logging Failures | 🟡 وسط | `audit_logs` للأعمال الإدارية فقط. لا توجد محاولات دخول فاشلة. |
| A10 | SSRF | 🟡 وسط | الـ proxy إلى Cloudinary/WhatsApp Bridge كلها URLs ثابتة من env. لكن CVE في Next.js للـ WebSocket SSRF — رقّع. |

### 3.2 هجمات أخرى

| الهجوم | الوضع | الملاحظات |
|---|---|---|
| XSS Reflected | 🟢 جيد | React + لا `dangerouslySetInnerHTML`. CSP موجود (مع `unsafe-inline`). |
| XSS Stored | 🟢 جيد | كل المحتوى من DB يُرَنْدَر عبر React. |
| CSRF | 🟡 وسط | Clerk يستخدم same-site cookies. أضف CSRF tokens لـ forms حساسة إن أمكن. |
| Clickjacking | 🟢 جيد | `X-Frame-Options: SAMEORIGIN`. |
| MITM | 🟢 جيد | HSTS + redirect to HTTPS في proxy. |
| Brute force | 🟡 وسط | Rate limit موجود لكن في الذاكرة فقط. اعتمد Clerk's lockout. |
| Account enumeration | 🟢 جيد | `/api/orders/public-track` يعيد 404 للجميع. |
| DoS | 🟡 وسط | Rate limit + global cap. ينقص حماية WAF/Cloudflare. |
| IDOR | 🟢 جيد | كل route يستعلم `eq("user_id", profile.id)`. |
| Path traversal | 🟢 جيد | كل المسارات عبر Next routing — لا fs.readFile بمدخلات. |
| File upload | 🟢 جيد | يفحص MIME + حجم + Cloudinary signed upload. |
| Open redirect | 🟢 جيد | `lib/auth/safe-redirect.ts` موجود. |
| Subdomain takeover | 🟡 وسط | تحقق من DNS — لا CNAME معلّق. |
| Prototype pollution | 🟡 وسط | `js-yaml < 4` ضعيف (في @sanity/cli). |
| ReDoS | 🟢 جيد | لا regex مفتوحة على مدخلات. |
| Deserialization | 🟢 جيد | كل JSON عبر `zod` parsing. |

---

## ٤) قائمة المهام الفورية (Action Plan)

### اليوم — قبل النوم

- [ ] **شغّل** `npm run security:rotate-plan` واقرأ القائمة كاملة.
- [ ] **دوّر** على الأقل: `SUPABASE_SERVICE_KEY`, `CLERK_SECRET_KEY`, `OPENAI_API_KEY`, `GITHUB_PERSONAL_ACCESS_TOKEN`, `HOSTINGER_API_TOKEN`.
- [ ] **احذف** `OWNER_BOOTSTRAP_PASSWORD` من `.env` نهائياً.
- [ ] **شغّل** نسخة احتياطية: `npm run backup:supabase`.
- [ ] **خزّن** النسخة في مكان آمن (drive خارجي، Google Drive مشفّر).

### هذا الأسبوع

- [ ] رقّع Next.js: `npm install next@latest && npm run build`.
- [ ] شغّل `npm audit fix` ثم `npm test && npm run test:e2e`.
- [ ] أضف GitHub Actions cron للنسخة الاحتياطية اليومية.
- [ ] فعّل PITR في Supabase (إن سمحت الميزانية).
- [ ] راجع كل ثغرات `npm audit` المتبقية وقرر: ترقية / accept risk.

### هذا الشهر

- [ ] نقل Rate Limit إلى Upstash Redis.
- [ ] إعادة بناء CSP باستخدام nonces (إزالة `unsafe-inline`).
- [ ] إضافة Cloudflare/WAF أمام الدومين.
- [ ] فعّل 2FA إجباري لكل أدوار `owner`, `admin`, `staff`.
- [ ] أضف Sentry/Logflare للـ error tracking + alerting.
- [ ] إعداد security headers test: https://securityheaders.com/?q=cookie-bite.com
- [ ] Pen-test بسيط: ZAP / Burp Suite Community.

---

## ٥) كيف تعيد التشغيل بسرعة بعد أي حادثة

### سيناريو: مفتاح مكشوف للعموم
```bash
# 1) دوّر فوراً
npm run security:rotate-plan
# 2) راجع logs Supabase
#    Dashboard → Logs → search by suspicious IP/queries في آخر 24 ساعة
# 3) راجع orders جديدة شاذة
#    SELECT * FROM orders WHERE created_at > now() - interval '6 hours'
#      AND total_egp > 50000 ORDER BY created_at DESC;
# 4) راجع audit_logs
```

### سيناريو: قاعدة البيانات تالفة / محذوفة
```bash
# 1) استعد آخر نسخة احتياطية
npm run backup:supabase:restore -- --from=backups/supabase-2026-... --confirm-prod
# 2) راجع counts قبل إعادة فتح الموقع
# 3) أرسل تنبيهاً للعملاء (إن لزم) عبر Resend
```

### سيناريو: Clerk تم اختراقه
```bash
# 1) في Clerk Dashboard → Users → Reset all sessions
# 2) دوّر CLERK_SECRET_KEY + CLERK_WEBHOOK_SIGNING_SECRET
# 3) فعّل 2FA إجباري للجميع (Clerk → Authentication → MFA)
```

---

## ٦) مصادر مفيدة

- OWASP Cheat Sheet: https://cheatsheetseries.owasp.org/
- Next.js Security Advisories: https://github.com/vercel/next.js/security/advisories
- Supabase Security: https://supabase.com/docs/guides/auth/row-level-security
- Clerk Security: https://clerk.com/docs/security/overview

---

**آخر تحديث:** هذا التقرير + أدواته المرافقة (security-audit, backup, rotate-plan).
بعد كل دورة شهرية شغّل:

```bash
npm run security:audit
```
