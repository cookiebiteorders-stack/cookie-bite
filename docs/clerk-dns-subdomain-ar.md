# خطأ `failed_to_load_clerk_js` — clerk.cookie-bite.com

## الرسالة

```
Failed to load Clerk JS, failed to load script:
https://clerk.cookie-bite.com/npm/@clerk/clerk-js@6/dist/clerk.browser.js
(code="failed_to_load_clerk_js")
```

## السبب

في **Clerk Dashboard** مُفعَّل **نطاق Frontend API** على `clerk.cookie-bite.com`، لكن **DNS لا يحتوي** سجلّاً لهذا الاسم (التحقق: `nslookup clerk.cookie-bite.com` → Non-existent domain).

Clerk يحاول تحميل `clerk-js` من نطاقك أنت، وليس من `*.clerk.accounts.dev`.

---

## الحل الكامل (إنتاج + محلي بمفاتيح live)

### 1) Clerk Dashboard

1. [Clerk Dashboard](https://dashboard.clerk.com) → **Configure** → **Domains** (أو DNS / Frontend API).
2. انسخ سجل **CNAME** المطلوب للنطاق الفرعي `clerk` (القيمة تظهر في اللوحة — غالباً نحو `frontend-api.clerk.services` أو ما يخص مثيلك).

### 2) Hostinger DNS

| النوع | الاسم (Host) | القيمة (Target) |
|--------|----------------|------------------|
| CNAME | `clerk` | القيمة من لوحة Clerk |

انتظر 5–60 دقيقة، ثم تحقق:

```bash
nslookup clerk.cookie-bite.com
```

يجب أن يحلّ الاسم بدون «Non-existent domain».

### 3) CSP (الموقع)

بعد تفعيل DNS، تأكد أن رؤوس الإنتاج تسمح بـ `https://clerk.cookie-bite.com` (مضافة في `next.config.ts`).

### 4) Redeploy

Hostinger → **Redeploy** بعد أي تغيير env.

---

## التطوير المحلي (`npm run dev`) — الأسرع

استخدم **مفاتيح Development** وليس Production:

| المتغير | القيمة |
|---------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` |
| `CLERK_SECRET_KEY` | `sk_test_...` |

ضعها في `.env.local` ثم أعد تشغيل `npm run dev`.

المشروع يضبط تلقائياً في التطوير:

`NEXT_PUBLIC_CLERK_JS_URL` → CDN jsDelivr إن لم تُحدّد القيمة يدوياً.

---

## بديل مؤقت (لا يغني عن DNS للإنتاج)

في `.env` أو Hostinger:

```env
NEXT_PUBLIC_CLERK_JS_URL=https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6/dist/clerk.browser.js
```

قد يحمّل السكربت فقط؛ طلبات **Frontend API** ما زالت تذهب إلى `clerk.cookie-bite.com` ما لم تُصلح DNS أو تستخدم `pk_test_` محلياً.

---

## إن لم تكن جاهزاً لـ DNS بعد

في Clerk → Domains: أزل/أجّل **Custom Frontend API** حتى يعود المثيل إلى `*.clerk.accounts.dev`، ثم أعد إضافة النطاق لاحقاً عند جاهزية DNS.
