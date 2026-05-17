# Supabase Database Files

هذا المجلد يحتوي كل ملفات قاعدة البيانات المطلوبة للمشروع:

- `migrations/`  
  كل تغييرات الهيكل (Schema + RLS + Policies + Triggers) بترتيب رقمي.
- `seed/`  
  بيانات ابتدائية للتشغيل المحلي أو بيئة dev.
- `checks/`  
  استعلامات فحص الأمان والسلامة.
- `functions/`  
  Edge Functions الخاصة بـ Supabase.

## التشغيل (Supabase Management API)

المتطلبات في `.env` أو `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ACCESS_TOKEN` — [Personal Access Token](https://supabase.com/dashboard/account/tokens) (ليس `SUPABASE_SERVICE_KEY`)

### 1) تطبيق كل الجداول الناقصة + التحقق (موصى به للإنتاج)

```bash
npm run supabase:ensure-schema
```

ينفّذ بالترتيب: تطبيق المايجريشنز الجديدة فقط عبر `POST /v1/projects/{ref}/database/query` ثم فحص الجداول الأساسية (يشمل `invoices`, `payments`, `notification_logs`, …).

### 2) تطبيق المايجريشنز فقط

```bash
npm run supabase:migrate
```

أو:

```bash
node scripts/supabase-run-migrations.mjs
```

يعيد تشغيل ملف واحد إن لزم:

```bash
node scripts/supabase-run-migrations.mjs --force=0019_invoices_payments_ensure.sql
```

### 3) فحص الأمان والصحة

```bash
node scripts/supabase-security-check.mjs
```

### 4) فحص شامل (جداول + ترحيلات + RLS)

```bash
npm run supabase:healthcheck
```

مع تطبيق الإصلاحات تلقائياً:

```bash
npm run supabase:healthcheck -- --fix
```

### 5) فحص وجود الجداول الأساسية (snapshot)

```bash
node scripts/supabase-schema-snapshot-check.mjs
```

يعتمد على `supabase/checks/expected-core-tables.json` ويجب تحديثه عند إضافة جداول أساسية جديدة للتطبيق.

### 6) تشغيل seed يدويًا

- افتح `supabase/seed/core.sql` و `supabase/seed/products.sql` في SQL Editor.
- أو استخدم سكربت query الحالي لتنفيذهما عبر Management API.

## ملاحظات مهمة

- السكربت `supabase-run-migrations.mjs` يقرأ `migrations/*.sql` ويتخطى ما سُجّل في `public.schema_migrations`.
- لعرض القائمة فقط: `npm run supabase:list-migrations`.
- إذا فشل migration قديم بسبب drift تاريخي، راجع **`0007_5_rls_helper_is_admin_or_owner.sql`** ووثائق `0005`/`0010`؛ السبب الشائع لأخطاء 0008 هو تشغيل 0008 قبل تعريف `is_admin_or_owner()`.
- لا تضع أسرار في SQL files أو seed files.
