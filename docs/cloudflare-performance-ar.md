# Cloudflare — أداء Cookie Bite (Hostinger + CDN)

الموقع يعمل على **Hostinger** مع **Next.js standalone**. ضع Cloudflare أمام `cookie-bite.com` (Orange cloud / Proxy).

## إعدادات عامة

| الإعداد | القيمة |
|--------|--------|
| SSL/TLS | Full (strict) |
| HTTP/3 | ON |
| Brotli | ON |
| Early Hints | ON |
| Auto Minify | HTML + CSS + JS (اختبر بعد النشر) |

## Cache Rules (لوحة Cloudflare → Rules → Cache Rules)

### 1. أصول Next الثابتة (immutable)

- **If:** URI Path starts with `/_next/static/`
- **Then:** Cache eligibility = Eligible, Edge TTL = 1 year, Respect origin = ON

### 2. صور `public` وملفات ثابتة

- **If:** URI Path matches regex `\.(webp|avif|jpg|jpeg|png|gif|svg|ico|woff2)$`
- **Then:** Edge TTL = 1 month

### 3. تجاوز الكاش — ديناميكي

- **If:** URI Path starts with `/api/cart` OR `/api/checkout` OR `/api/orders` OR `/api/account` OR `/api/wishlist` OR `/api/promo`
- **Then:** Bypass cache

### 4. API المنتجات (قصير)

- **If:** URI Path equals `/api/products` OR starts with `/api/products/`
- **Then:** Edge TTL = 60 seconds, Respect origin Cache-Control = ON

### 5. HTML / الصفحات

- **If:** Host equals `cookie-bite.com` AND NOT static extension
- **Then:** Cache eligibility = Bypass (أو Edge TTL قصير 0) — يفضّل عدم كاش HTML على Edge لتفادي RSC قديم

## تحذيرات

- لا تفعّل **Cache Everything** على `/` بدون استثناءات API.
- بعد كل Deploy: Purge Cache → **Purge by prefix** `/_next/static/` فقط إن لزم.
- PWA على المتصفح: التطبيق يستخدم Network-first لـ HTML (انظر `next.config.ts`).

## Redis اختياري

إذا `REDIS_URL` مضبوط على Hostinger، `/api/products` يستخدم كاش 60 ثانية في Redis بالإضافة إلى `s-maxage=60`.
