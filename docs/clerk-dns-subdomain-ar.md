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
- تأكد أن `failed_to_load_clerk_js` اختفى (`nslookup clerk.cookie-bite.com` يجب أن يحلّ الاسم).

## خطأ `failed_to_load_clerk_js`

يحدث عندما `clerk.cookie-bite.com` غير موجود في DNS — راجع السجل `clerk` → `frontend-api.clerk.services` أعلاه.
