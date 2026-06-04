# تحسين الأداء — Cookie Bite (ملخص التنفيذ)

## الأهداف

- PageSpeed Mobile 90+ (تدريجياً)
- LCP &lt; 2.5s على الإنتاج
- كاش ذكي دون كسر السلة/الدفع

## ما تم تنفيذه (مراحل 1–5)

### الخطوط والصور

- خطان في الجذر: **Cairo** + **DM Sans**
- Cloudinary: `f_auto,q_auto,w_*` عبر `lib/products/cloudinary-delivery.ts`
- `next/image`: AVIF/WebP

### JavaScript

- حذف morph / three / html2canvas / gsap
- Mr. Brownie: FAB خفيف ثم تحميل الشات
- Clerk في الهيدر: chunk مؤجل (`site-header-auth-slot`)
- `optimizePackageImports` لـ lucide و motion وغيرها
- Loki + Tracker: على **المتجر** فقط (`storefront-runtime-effects`)
- `StaffAdminNavProvider`: متجر + إدارة فقط

### الكاش

- `/_next/static`: immutable
- `/api/products`: s-maxage 60 + Redis 60s (إن وُجد `REDIS_URL`)
- cart/checkout/orders: `no-store`
- PWA: كاش منتجات 60s (ليس ساعة)
- `unstable_cache`: featured, trending, كتالوج المتجر

### SSR / ISR

- `/`: `revalidate = 300`
- `/shop`: `revalidate = 120` + `initialCatalog`
- `/shop/[slug]`: `revalidate = 60` + `initialPayload`

### أدوات

```bash
npm run analyze    # bundle analyzer
npm run type-check
npm run build
```

### Cloudflare

راجع `docs/cloudflare-performance-ar.md`

## بعد كل Deploy

1. Hostinger Redeploy
2. Purge Cloudflare لـ `/_next/static` عند تغيير CSS كبير
3. PageSpeed على `/` و `/shop`

## متغيرات موصى بها

- `REDIS_URL` — كاش API المنتجات
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — صور محسّنة
