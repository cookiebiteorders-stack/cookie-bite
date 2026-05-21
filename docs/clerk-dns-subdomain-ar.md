# سجلات DNS لـ Clerk على cookie-bite.com

## التحقق العام (DNS عام عبر 1.1.1.1)

Nameservers الحالية: `apollo.dns-parking.com`, `athena.dns-parking.com` (Hostinger).

| Host (نسبي) | FQDN | النوع | الهدف (يجب أن يطابق حرفياً) |
|-------------|------|--------|------------------------------|
| `accounts` | accounts.cookie-bite.com | CNAME | `accounts.clerk.services` |
| `clerk` | clerk.cookie-bite.com | CNAME | `frontend-api.clerk.services` |
| `clk._domainkey` | clk._domainkey.cookie-bite.com | CNAME | `dkim1.oigyiaf8hxbe.clerk.services` |
| `clk2._domainkey` | clk2._domainkey.cookie-bite.com | CNAME | `dkim2.oigyiaf8hxbe.clerk.services` |
| `clkmail` | clkmail.cookie-bite.com | CNAME | `mail.oigyiaf8hxbe.clerk.services` |

- **لا تستخدم Proxy** (في Cloudflare: DNS only / grey cloud).
- لا تضف `https://` ولا شرطة مائلة في قيمة CNAME.
- بعض الواجهات تطلب الهدف بشرطة نهائية `frontend-api.clerk.services.` — جرّب بدونها أولاً كما في Clerk.

## Hostinger — يدوياً

1. hPanel → **Domains** → `cookie-bite.com` → **DNS / DNS Zone**.
2. أضف **5 سجلات CNAME** بالجدول أعلاه (العمود Host = Name).
3. احفظ وانتظر 5–60 دقيقة (أحياناً حتى 24 ساعة).
4. Clerk Dashboard → **Domains** → **Verify** لكل سجل.

## أتمتة (اختياري)

إن وُجد `HOSTINGER_API_TOKEN` في `.env` يمكن استخدام [Hostinger DNS API](https://developers.hostinger.com/docs/dns) — انتبه: بعض سكربتات المشروع تستخدم `overwrite: true` وقد تستبدل السجلات الأخرى؛ للـ Clerk يُفضّل الإضافة اليدوية أو سكربت مخصص يدمج السجلات فقط.

## بعد التحقق

- Redeploy على Hostinger.
- في Clerk Dashboard اضغط **Verify** حتى تصبح السجلات خضراء — عندها يُصدر Clerk شهادة TLS لـ `clerk.*` و`accounts.*`.
- إن كان DNS صحيحاً لكن المتصفح ما زال يفشل: غالباً **SSL لم يُفعَّل بعد** (انتظر أو أعد Verify في Clerk).

### تحقق سريع

```powershell
Resolve-DnsName clerk.cookie-bite.com -Type CNAME -Server 1.1.1.1
```

يجب: `frontend-api.clerk.services`

## التطوير المحلي (`npm run dev`)

إن استمر الخطأ مع `pk_live_`:

1. أعد تشغيل `npm run dev` بعد `git pull`.
2. أو فعّل مفاتيح التطوير في `.env.local`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
3. أو أضف صراحةً:
   ```env
   NEXT_PUBLIC_CLERK_JS_URL=https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6/dist/clerk.browser.js
   ```

الكود يمرّر `__internal_clerkJSUrl` من CDN تلقائياً في `NODE_ENV=development`.

## خطأ `failed_to_load_clerk_js`

يحدث عندما `clerk.cookie-bite.com` غير موجود في DNS — راجع السجل `clerk` → `frontend-api.clerk.services` أعلاه.
