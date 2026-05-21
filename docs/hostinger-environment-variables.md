# Hostinger — مرجع متغيرات البيئة (cookie-bite.com)

انسخ القيم من `.env` المحلي إلى **hPanel → Websites → cookie-bite.com → Node.js → Settings & Redeploy → Environment variables**، ثم **Redeploy**.

## إنشاء ملف جاهز للاستيراد (Gemini فقط)

```bash
npm run hostinger:export-gemini-env
```

يُنشئ `hostinger-gemini.env` (مُستثنى من Git) — استورده في Hostinger أو انسخ المحتوى يدوياً.

## المتغيرات الإلزامية للإنتاج

| المتغير | ملاحظات |
|---------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://cookie-bite.com` |
| `APP_BASE_URL` | نفس الأصل بدون مسار زائد |
| `COOKIE_BITE_PRIMARY_DOMAIN` | `cookie-bite.com` (اختياري — افتراضي الكود) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | من Clerk Dashboard |
| `CLERK_SECRET_KEY` | خادم فقط |
| `CLERK_WEBHOOK_SIGNING_SECRET` | توقيع webhook Svix — **ليس** `CLERK_WEBHOOK_SECRET` |
| `NEXT_PUBLIC_SUPABASE_URL` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | |
| `SUPABASE_SERVICE_KEY` | خادم فقط |
| `PAYMOB_API_KEY` | |
| `PAYMOB_HMAC_SECRET` | HMAC لـ intention + webhook — **المُفضّل** |
| `PAYMOB_HMAC` | بديل قديم؛ إن وُضع مع `PAYMOB_HMAC_SECRET` يُفضّل الأخير في الكود حيث يُطبَّق كلاهما للتحقق من الإنتاج |
| `PAYMOB_INTEGRATION_ID_CARD` | من لوحة Paymob |
| `PAYMOB_INTEGRATION_ID_WALLET` | محافظ / بدائل الدفع |
| `RESEND_API_KEY` | |
| `RESEND_FROM_EMAIL` | صندوق على نطاق موثّق |
| `INTERNAL_API_SECRET` | APIs داخلية |
| `REVALIDATE_SECRET` | `POST /api/revalidate` |

## Clerk — نطاق `clerk.cookie-bite.com`

إن ظهر `failed_to_load_clerk_js`: أضف **CNAME** لـ `clerk` في DNS (قيمة Clerk Dashboard) ثم Redeploy.  
الدليل: `docs/clerk-dns-subdomain-ar.md`

| المتغير | ملاحظات |
|---------|---------|
| `NEXT_PUBLIC_CLERK_JS_URL` | اختياري — CDN احتياطي؛ التطوير يضبطه تلقائياً إن لم يُعرَّف |

## Google OAuth Branding (تحقق ملكية الموقع)

| المتغير | الغرض |
|---------|--------|
| `GOOGLE_SITE_VERIFICATION` | وسم HTML من Search Console — **نفس حساب** Google Cloud |

بعد الإضافة: **Redeploy** ثم Verify في Search Console، ثم أعد Branding verification في OAuth consent screen.  
الدليل الكامل: `docs/google-oauth-branding-verification-ar.md`

## موصى به (AI + محتوى)

| المتغير | الغرض |
|---------|--------|
| `GEMINI_API_KEY` | Mrs. Cookie + Mr. Brownie + مساعد المنتج |
| `MR_BROWNIE_GEMINI_MODEL` | افتراضي: `gemini-flash-latest` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | مدونة / CMS |
| `NEXT_PUBLIC_SANITY_DATASET` | عادة `production` |
| `SANITY_WEBHOOK_SECRET` | إعادة بناء عند النشر من Sanity |

## Cron — طابور الإشعارات (بدون Redis)

| الإعداد | القيمة |
|---------|--------|
| التكرار | كل **5 دقائق** |
| الطريقة | `POST` |
| الرابط | `https://cookie-bite.com/api/cron/notification-jobs?limit=20` |
| الترويسة | `x-internal-secret: <INTERNAL_API_SECRET>` |

```bash
npm run hostinger:env-audit
npm run hostinger:checklist
```

## صارم عند الإقلاع

اضبط `COOKIE_BITE_FAIL_ON_MISSING_ENV=true` لرفض التشغيل إن نقص متغير إلزامي (انظر `lib/config/production-lock.ts`).
