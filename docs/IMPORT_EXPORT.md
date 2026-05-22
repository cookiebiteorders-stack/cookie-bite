# Import / Export Management System

نظام موحّد لاستيراد وتصدير بيانات لوحة الإدارة (Cookie Bite). مبني على **Next.js App Router** (وليس Express منفصل) مع **Supabase** وخدمة **Python FastAPI** لتحليل PDF.

## البنية

```
lib/admin/import-export/
  types.ts              # أنواع مشتركة
  module-registry.ts    # إعدادات كل وحدة (products, orders, …)
  file-parser.ts        # CSV / XLSX / PDF (PDF → Python)
  column-mapper.ts      # تعيين الأعمدة
  validation-engine.ts  # Zod لكل وحدة
  import-service.ts     # معاينة + commit + سجلات
  export-service.ts     # تصدير + سجلات
  export-builder.ts     # CSV / XLSX / PDF
  handlers/             # commit لكل وحدة
  storage.ts            # Supabase Storage (admin-imports)

app/api/admin/import-export/
  [module]/preview      POST multipart
  [module]/import       POST multipart
  [module]/export       GET ?format=&scope=&download=1
  [module]/template     GET CSV template
  import/history        GET
  export/history        GET

components/admin/import-export/
  ImportExportToolbar   # أزرار استيراد / تصدير / سجل
  ImportModal, ExportModal, FileUploader, TablePreview, …

hooks/use-import-export.ts

cookie-bite-python/.../routers/import_parser.py
  POST /import/parse-pdf
  POST /parse-pdf (alias)
```

## API (للمطور)

| Method | Path | الوصف |
|--------|------|--------|
| POST | `/api/admin/import-export/{module}/preview` | معاينة + تعيين أعمدة |
| POST | `/api/admin/import-export/{module}/import` | حفظ بعد المعاينة |
| GET | `/api/admin/import-export/{module}/export?format=csv\|xlsx\|pdf&scope=all\|filtered\|selected&download=1` | تنزيل ملف |
| GET | `/api/admin/import-export/{module}/template` | قالب CSV |
| GET | `/api/admin/import-export/import/history?module=products` | سجل استيراد |
| GET | `/api/admin/import-export/export/history?module=products` | سجل تصدير |

**المصادقة:** Clerk + `requireAdminAccess(module)` + RBAC.

## الوحدات

| Module | Import | Export | Handler |
|--------|--------|--------|---------|
| products | ✓ | ✓ | تحديث حسب `id` |
| discounts | ✓ | ✓ | insert `promo_codes` |
| financial | ✓ | ✓ | insert `expenses` |
| shipping | ✓ | ✓ | insert `shipping_zones` |
| orders, customers, … | — | ✓ | تصدير من الجدول |

## Supabase

1. تشغيل migration: `npm run supabase:migrate` (ملف `0030_import_export_system.sql`).
2. إنشاء bucket خاص: **`admin-imports`** (Dashboard → Storage).
3. الجداول: `import_logs`, `export_logs`, `failed_imports` (RLS لـ service_role).

## Python PDF

```bash
npm run python:up
```

في `.env`:

```
PYTHON_API_URL=http://127.0.0.1:8000
```

`POST /parse-pdf` — رفع PDF، استخراج جداول عبر pdfplumber.

## استخدام في صفحة إدارة

```tsx
import { ImportExportToolbar } from "@/components/admin/import-export/import-export-toolbar";

<ImportExportToolbar
  module="products"
  canWrite={canWrite}
  onImportSuccess={() => void reload()}
/>
```

## حدود الأمان

- حجم ملف: 12MB
- أنواع: `.csv`, `.xlsx`, `.pdf`
- تعقيم خلايا + Zod
- Audit log عند كل import/export

## توسيع وحدة جديدة

1. أضف إعدادات في `module-registry.ts`.
2. أضف schema في `validation-engine.ts` (إن لزم).
3. أضف handler في `handlers/index.ts`.
4. ضع `<ImportExportToolbar module="…" />` في لوحة الوحدة.
