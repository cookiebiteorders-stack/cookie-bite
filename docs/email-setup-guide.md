# دليل إعداد البريد الإلكتروني — Cookie Bite

> **هذا الملف موجّه لك (مالك المشروع) لإكمال إعداد البريد الإلكتروني الإنتاجي. الكود في الـ repo جاهز بالكامل — يبقى فقط إعداد DNS وإضافة المتغيرات في الـ environment.**

---

## 🏗️ معمارية النظام (مطابقة لأفضل الممارسات)

```
العميل (متصفّح)
      │
      ▼  HTTPS
الموقع Next.js (cookie-bite.com)
      │
      ▼  Server Action / API Route
Resend API (re_xxx)
      │
      ▼  SMTP / Sender Reputation
بريد العميل (Gmail, Outlook, Apple Mail …)

ردود العملاء  ────────────►  Hostinger Mailbox (cookie-bite@cookie-bite.com)
                              (عبر MX records)
```

**القاعدة الذهبية**: Resend للإرسال (سرعة + سمعة عالية + تتبّع)، Hostinger للاستقبال (صندوق احترافي للردود).

---

## ✅ ما تم تنفيذه فعلياً في الكود

| القطعة | الحالة | المسار |
|---|---|---|
| Resend SDK | ✅ مُثبّت | `package.json` → `resend` |
| Lazy client + brand defaults | ✅ | `lib/email/resend.ts` |
| Dispatch + ReplyTo automation | ✅ | `lib/email/send.ts` |
| 23 قالب مُبَرند بلوحة Cookie Bite | ✅ | `lib/notification-library/templates/*` |
| نموذج اتصال يحفظ + يُشعر الفريق + رد تلقائي | ✅ | `app/api/contact/route.ts` |
| تأكيد طلب يُرسل عبر Resend | ✅ | `app/api/checkout/paymob/intention/route.ts` |
| Webhook Clerk → إرسال welcome | ✅ | `app/api/webhooks/clerk/route.ts` |
| Admin Template Library + Test Send | ✅ | `/admin/template-library` |
| `.env.example` يوثّق كل المتغيرات | ✅ | `.env.example` |

---

## 1️⃣ Resend — توثيق الدومين

### 1.1 إنشاء حساب وإضافة الدومين

1. ادخل على [resend.com](https://resend.com) وأنشئ حساباً.
2. **Domains** ← **Add Domain** → `cookie-bite.com`.
3. اختر **Region** الأقرب (مثلاً `eu-west-1` للشرق الأوسط).
4. Resend سيعرض لك **3 سجلات DNS** يجب إضافتها في Cloudflare.

### 1.2 إنشاء API Key

1. **API Keys** ← **Create API Key**.
2. اختر **Permission: Sending access** فقط (مبدأ أقل امتيازات).
3. **اسم**: `cookie-bite-production`.
4. انسخ المفتاح يبدأ بـ `re_…` وضعه في `RESEND_API_KEY` (لن يظهر مرة أخرى).

---

## 2️⃣ Cloudflare — سجلّات DNS

> اذهب إلى [dash.cloudflare.com](https://dash.cloudflare.com) → اختر `cookie-bite.com` → **DNS** → **Records**.

### 2.1 سجلّات الإرسال (Resend) — ✨ أساسية للوصول للـ inbox

| Type | Name | Value | TTL | Proxy |
|---|---|---|---|---|
| **TXT** (SPF) | `@` | `v=spf1 include:_spf.resend.com include:_spf.titan.email ~all` | Auto | **DNS only (Off)** |
| **TXT** (DKIM) | `resend._domainkey` | _(القيمة الطويلة من Resend — تبدأ بـ `p=…`)_ | Auto | **DNS only (Off)** |
| **MX** (Resend bounce) | `send` | `feedback-smtp.eu-west-1.amazonses.com` priority **10** | Auto | **DNS only (Off)** |
| **TXT** (DMARC) | `_dmarc` | `v=DMARC1; p=quarantine; pct=100; rua=mailto:cookie-bite@cookie-bite.com; aspf=s; adkim=s` | Auto | **DNS only (Off)** |

### 2.2 سجلّات الاستقبال (Hostinger) — للردود إلى صندوق Webmail

| Type | Name | Value | Priority |
|---|---|---|---|
| **MX** | `@` | `mx1.hostinger.com` | 5 |
| **MX** | `@` | `mx2.hostinger.com` | 10 |

> ⚠️ **SPF واحد فقط لكل دومين.** السطر أعلاه يجمع **Resend + Hostinger** معاً (`include:_spf.resend.com include:_spf.titan.email`). إن كان لديك SPF قديم احذفه واترك هذا فقط.

### 2.3 قواعد Cloudflare الحرجة

- ✅ كل سجلّات البريد **DNS Only** (السحابة الرمادية، **ليس** البرتقالية).
- ❌ لا تُفعّل **Email Routing** في Cloudflare — هذا سيتعارض مع MX الخاص بـ Hostinger.
- ✅ تفقّد الـ propagation عبر [dnschecker.org](https://dnschecker.org) — قد تأخذ 5–30 دقيقة.

### 2.4 التحقق من النجاح

1. ارجع إلى Resend → **Domains** → `cookie-bite.com` — يجب أن تتحوّل الحالة إلى **Verified ✓** (يتم كل دقيقة، خلال 10 دقائق).
2. أرسل بريد اختبار من Resend Dashboard → افتح **mail-tester.com** → سيجب الحصول على **9–10/10**.

---

## 3️⃣ متغيّرات البيئة (Production)

أضف في **Vercel** (أو منصة الاستضافة) هذه المتغيرات — تطابق ما في `.env.example`:

```env
# نسخ متغيرات Resend الأساسية
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
RESEND_FROM_EMAIL="Cookie Bite <cookie-bite@cookie-bite.com>"
RESEND_REPLY_TO=cookie-bite@cookie-bite.com
CONTACT_INBOX=cookie-bite@cookie-bite.com
RESEND_DOMAIN=cookie-bite.com
NEXT_PUBLIC_APP_URL=https://cookie-bite.com
```

> 🔒 **أمان**: `RESEND_API_KEY` يجب أن يكون **server-only**. لا تستخدم `NEXT_PUBLIC_` معه أبداً — كل الإرسال يحدث في API routes / Server Actions، لا في المتصفّح.

---

## 4️⃣ الفلوهات الموجودة (لا تحتاج كود إضافي)

| الحدث | الـ trigger | القالب | المسار |
|---|---|---|---|
| تسجيل عميل جديد | Clerk webhook `user.created` | `welcome` | `app/api/webhooks/clerk/route.ts` |
| تأكيد طلب | Paymob intention success | `order-confirmed` | `app/api/checkout/paymob/intention/route.ts` |
| تحديث حالة طلب | Admin يضغط زر تحديث | `report-order-status` | `app/api/notifications/order-status/route.ts` |
| نموذج اتصال | المستخدم يرسل | `[Contact]` + رد تلقائي | `app/api/contact/route.ts` |
| إعادة تعيين كلمة السر | Clerk (مُدار من Clerk) | قالب Clerk | إعدادات Clerk Dashboard |
| OTP / 2FA | Clerk (مُدار من Clerk) | قالب Clerk | إعدادات Clerk Dashboard |
| أي قالب آخر | استدعاء `sendTemplateEmail()` | أي مفتاح من registry | `lib/email/send.ts` |

> 💡 لتبديل قوالب Clerk (OTP، Welcome، Password Reset) لتظهر بهوية Cookie Bite، اذهب إلى **Clerk Dashboard → Customization → Emails** والصق HTML قالبنا من `/admin/template-library` (انسخ HTML من زر **Copy HTML**).

---

## 5️⃣ التشغيل اليومي

### اختبار سريع من Admin Console

1. ادخل إلى `https://cookie-bite.com/admin/template-library`.
2. اختر أي قالب من القائمة الجانبية.
3. اضغط **Send test** → أدخل بريدك → افتحه خلال 30 ثانية.
4. تحقّق:
   - **From** يقول "Cookie Bite <cookie-bite@cookie-bite.com>" (ليس spam).
   - **Logo** يظهر أعلى الإيميل (cookie-mark + Cookie Bite serif + tagline).
   - الألوان: كريم + تيراكوتا (ليس نيڤي).
   - الردّ يذهب إلى Hostinger Webmail.

### مراقبة الإرسال

- **Resend Dashboard → Logs**: يعرض كل إيميل تم إرساله مع حالة (delivered, bounced, complained).
- **Resend Dashboard → Domains**: نسبة تسليم الدومين — يجب أن تبقى فوق 95%.
- إن انخفضت نسبة التسليم، تحقّق من DMARC report (يصل إلى `cookie-bite@cookie-bite.com` كل أسبوع).

---

## 6️⃣ Troubleshooting شائع

| العَرَض | الحلّ |
|---|---|
| الإيميل يصل إلى **Spam** | تحقّق من SPF + DKIM في mxtoolbox.com — كلاهما يجب أن يقول "PASS" |
| **DKIM failing** | تأكّد أنك نسخت قيمة DKIM من Resend كاملة (سطر واحد، بدون مسافات) |
| الـ **From** يظهر "via amazonses.com" في Gmail | الدومين غير verified بعد — انتظر propagation وتفقّد Resend Verify |
| **Reply** لا يصل إلى Hostinger | تأكّد أن MX records لـ Hostinger مضافة (mx1/mx2.hostinger.com) |
| `Missing RESEND_API_KEY` في الـ logs | المتغيّر غير مضاف في Vercel — أضفه ثم Redeploy |

---

## 7️⃣ أسعار Resend (مرجع)

| الباقة | الإيميلات شهرياً | السعر |
|---|---|---|
| Free | 3,000 | $0 |
| Pro | 50,000 | $20 |
| Scale | 100,000 | $90 |

**Cookie Bite الآن**: الـ Free tier يكفي للسنة الأولى تقريباً (3,000 إيميل = ~100 طلب يومياً مع 1 confirmation + 1 shipping per order).

---

## 📞 جهات اتصال سريعة

- **Resend support**: [support@resend.com](mailto:support@resend.com)
- **Hostinger support**: عبر الـ Live Chat في cPanel
- **Cloudflare support**: [support.cloudflare.com](https://support.cloudflare.com)

---

_آخر تحديث: مايو 2026 — تم التحقّق مع `lib/email/resend.ts` و `lib/notification-library`._
