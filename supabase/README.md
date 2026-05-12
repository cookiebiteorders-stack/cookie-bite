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

## التشغيل

### 1) تشغيل كل المايجريشنز

```bash
node scripts/supabase-run-migrations.mjs
```

### 2) فحص الأمان والصحة

```bash
node scripts/supabase-security-check.mjs
```

### 3) فحص وجود الجداول الأساسية (snapshot)

```bash
node scripts/supabase-schema-snapshot-check.mjs
```

يعتمد على `supabase/checks/expected-core-tables.json` ويجب تحديثه عند إضافة جداول أساسية جديدة للتطبيق.

### 4) تشغيل seed يدويًا

- افتح `supabase/seed/core.sql` و `supabase/seed/products.sql` في SQL Editor.
- أو استخدم سكربت query الحالي لتنفيذهما عبر Management API.

## ملاحظات مهمة

- السكربت `supabase-run-migrations.mjs` يقرأ كل ملفات `migrations/*.sql` تلقائيًا بالترتيب.
- إذا فشل migration قديم بسبب drift تاريخي، راجع **`0007_5_rls_helper_is_admin_or_owner.sql`** ووثائق `0005`/`0010`؛ السبب الشائع لأخطاء 0008 هو تشغيل 0008 قبل تعريف `is_admin_or_owner()`.
- لا تضع أسرار في SQL files أو seed files.
