# دليل إعداد البريد الإلكتروني — Cookie Bite

> **هذا الملف يوثّق الحالة الإنتاجية الفعلية لـ cookie-bite.com (محدّث مايو 2026). الكثير من خطوات DNS تمّت آلياً عبر Hostinger API. الباقي خطوة واحدة يدوية في Resend Dashboard.**

---

## ⚡ TL;DR — ما تبقّى عليك

```
✅ DNS Provider:       Hostinger (apollo/athena.dns-parking.com)
✅ Domain:             cookie-bite.com (active until 2028)
✅ MX Inbox:           mx1/mx2.hostinger.com (يعمل)
✅ SPF:                v=spf1 include:_spf.resend.com include:_spf.mail.hostinger.com ~all
✅ DMARC:              p=quarantine + rua reporting إلى cookie-bite@cookie-bite.com
✅ Resend API key:     send-only key حيّ يرسل من onboarding@resend.dev
✅ Codebase:           جاهز بالكامل — 23 قالب + 3 سكربتات تشخيص

⏳ ما تبقّى يدوياً (دقيقتان):
   1. https://resend.com/domains → Add Domain → cookie-bite.com
   2. انسخ قيمة DKIM (تبدأ بـ "p=...")
   3. npm run email:finalize-dns -- "<paste DKIM here>"
   4. ارجع لـ Resend → اضغط "Verify DNS"
   5. npm run email:check للتأكد
```

---

## 🏗️ المعمارية الحقيقية

```
العميل (متصفّح)
      │
      ▼  HTTPS
Next.js (cookie-bite.com)
      │
      ▼  Server API Route
Resend API → بريد العميل
      │
الردود ────► Hostinger Mailbox (cookie-bite@cookie-bite.com عبر MX)
```

| الطبقة | المزوّد | الحالة |
|---|---|---|
| Domain registrar | Hostinger | ✅ مفعّل |
| DNS authoritative | Hostinger (`apollo/athena.dns-parking.com`) | ✅ مدار آلياً |
| Inbox / Webmail | Hostinger "Starter Business Email" | ✅ in_trial |
| Transactional sender | Resend | ⏳ يحتاج DKIM |
| Webhook signature (Clerk) | Clerk Dashboard | ⏳ يحتاج إعداد |

> ⚠️ **ملاحظة مهمة**: الـ DNS مُدار حالياً عبر **Hostinger** (وليس Cloudflare كما كنت أتوقّع). هذا ممتاز — كل تعديل DNS يمكن تنفيذه آلياً عبر Hostinger API.

---

## ✅ ما تم تنفيذه آلياً (لا تحتاج لمسه)

### في الكود
| القطعة | المسار |
|---|---|
| Resend SDK lazy client + brand defaults | `lib/email/resend.ts` |
| Dispatcher مع Reply-To تلقائي | `lib/email/send.ts` |
| 23 قالب بـ Cookie Bite branding | `lib/notification-library/templates/*` |
| نموذج اتصال + رد تلقائي للعميل | `app/api/contact/route.ts` |
| تأكيد طلب (Paymob) | `app/api/checkout/paymob/intention/route.ts` |
| Welcome عند تسجيل عميل جديد | `app/api/webhooks/clerk/route.ts` |
| Admin "Send test" UI | `/admin/template-library` |
| سكربت تشخيص شامل | `scripts/email-diagnostics.mjs` |
| سكربت إنهاء DNS | `scripts/resend-dns-finalize.mjs` |

### في DNS (عبر Hostinger API)
| السجلّ | القيمة | الحالة |
|---|---|---|
| **SPF** `@` TXT | `v=spf1 include:_spf.resend.com include:_spf.mail.hostinger.com ~all` | ✅ |
| **DMARC** `_dmarc` TXT | `v=DMARC1; p=quarantine; pct=100; rua=mailto:cookie-bite@cookie-bite.com; ruf=mailto:cookie-bite@cookie-bite.com; aspf=s; adkim=s; fo=1` | ✅ |
| **Inbox MX** `@` | `5 mx1.hostinger.com`, `10 mx2.hostinger.com` | ✅ (كان موجود) |
| **Hostinger DKIM** | `hostingermail-a/b/c._domainkey` CNAMEs | ✅ (كان موجود) |
| **Resend DKIM** `resend._domainkey` TXT | يحتاج النسخ من Resend Dashboard | ⏳ |
| **Resend bounce MX** `send` | `10 feedback-smtp.eu-west-1.amazonses.com` | ⏳ |

### في `.env`
```env
RESEND_API_KEY=re_LSBAj2Kz_…  # send-only key (موجود)
RESEND_FROM_EMAIL="Cookie Bite <orders@cookie-bite.com>"
RESEND_REPLY_TO=cookie-bite@cookie-bite.com   # ← تم إصلاحه (كان gmail)
CONTACT_INBOX=cookie-bite@cookie-bite.com
RESEND_DOMAIN=cookie-bite.com
```

---

## ⏳ الخطوات اليدوية المتبقّية (دقيقتان)

### 1. أضف الدومين في Resend Dashboard

1. ادخل: <https://resend.com/domains>
2. اضغط **Add Domain** → اكتب: `cookie-bite.com`
3. اختر **Region**: `eu-west-1` (الأقرب للشرق الأوسط).
4. Resend ستعرض 3 سجلات. **ركّز فقط على الـ DKIM** — هو السطر الطويل التي تحت `Type: TXT, Name: resend._domainkey`.
5. انسخ كامل القيمة (تبدأ بـ `p=…` وقد تكون 300+ حرفاً).

### 2. أضف الـ DKIM إلى Hostinger DNS

من جذر المشروع:

```powershell
npm run email:finalize-dns -- "p=MIGfMA0GCS...الـDKIMالطويلة...AQAB"
```

السكربت سيُضيف:
- **DKIM TXT** `resend._domainkey` → القيمة التي ألصقتها
- **Bounce MX** `send` → `10 feedback-smtp.eu-west-1.amazonses.com`

### 3. ارجع لـ Resend Dashboard

- اضغط **Verify DNS Records** → الحالة تتحوّل إلى **Verified ✓** خلال 1–5 دقائق.

### 4. تحقّق

```powershell
npm run email:check
```

يجب أن يظهر:
```
[2] Resend domain send (using your From address)
  PASS  send from verified domain — message id: <uuid>
```

### 5. (اختياري) فعّل قوالب Clerk بهوية Cookie Bite

في **Clerk Dashboard → Customization → Emails**:
1. اختر قالب (Welcome / OTP / Password Reset).
2. ادخل `/admin/template-library` في موقعك → اضغط **Copy HTML** على القالب المُكافئ.
3. الصق في Clerk + استبدل `{{variables}}` بمتغيّرات Clerk.

### 6. (اختياري) أنشئ Clerk Webhook signing secret

- Clerk Dashboard → **Webhooks** → **Add Endpoint** → `https://cookie-bite.com/api/webhooks/clerk`
- انسخ الـ Signing Secret → ضعه في `.env`:  
  `CLERK_WEBHOOK_SIGNING_SECRET=whsec_…`

---

## 🧪 الاختبار اليدوي

من Admin Console:
1. ادخل `/admin/template-library`
2. اختر "Order confirmed" (أو أي قالب)
3. **Send test** → اكتب بريدك → افتحه خلال 30 ثانية
4. تحقّق:
   - **From** = "Cookie Bite <orders@cookie-bite.com>" — ليس spam
   - **Reply** يصل إلى `cookie-bite@cookie-bite.com` (Hostinger Webmail)
   - اللوغو يظهر، الألوان كريم/تيراكوتا

---

## 🛠️ السكربتات المتاحة

| الأمر | الوظيفة |
|---|---|
| `npm run email:check` | تشخيص شامل — يرسل اختبار + يفحص DNS + يطبع ملخّص |
| `npm run email:finalize-dns -- "<DKIM>"` | يضيف DKIM + bounce MX إلى Hostinger DNS |
| `npm run deploy:github -- "msg"` | رفع التغييرات إلى main |

---

## 🚨 Troubleshooting

| المشكلة | السبب الأرجح | الحلّ |
|---|---|---|
| `domain not yet verified` | DKIM لم يُضف بعد | شغّل `email:finalize-dns` بقيمة DKIM |
| الإيميل يصل لـ Spam | DMARC أصبح صارم (p=quarantine) — طبيعي في أول أسبوع | انتظر تراكم سمعة إرسال (≥1000 رسالة) ثم ارفع لـ p=reject |
| Reply لا يصل | `RESEND_REPLY_TO` خاطئ أو Inbox MX مفقود | شغّل `email:check` |
| `Missing RESEND_API_KEY` | المتغيّر غير مضاف في Vercel | أضفه ثم Redeploy |
| `restricted_api_key` عند `/domains` API | المفتاح send-only فقط | أنشئ Full Access key من Resend (إن احتجت أتمتة Domain Management) |

---

## 📊 سعر Resend (مرجع)

| الباقة | إيميل/شهر | السعر |
|---|---|---|
| Free | 3,000 | $0 |
| Pro | 50,000 | $20 |
| Scale | 100,000 | $90 |

Cookie Bite الآن: الـ Free tier يكفي لأول 6–12 شهراً.

---

_آخر تحديث: مايو 2026 — مع `scripts/email-diagnostics.mjs` و حالة DNS الفعلية._
