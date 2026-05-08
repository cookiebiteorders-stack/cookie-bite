# Cookie Bite — Admin & Owner Dashboard Master Plan

## الهدف
تحويل مواصفات لوحة التحكم الشاملة إلى تنفيذ إنتاجي داخل هذا المشروع مع الحفاظ على:
- هوية العلامة (luxury + playful)
- أمان عالٍ (RBAC + RLS + audit)
- جاهزية تشغيل كاملة على `cookie-bite.com`

## الحالة الحالية (مختصر)
- يوجد RBAC أساسي في `lib/admin/rbac.ts` + حراسة عبر `proxy.ts`.
- يوجد APIs أساسية للتجارة + إضافات إدارية (orders/analytics/push/sync).
- يوجد توسع قاعدة بيانات في `supabase/migrations/0003_v2_extend_schema.sql`.
- يوجد تكاملات مبدئية: Clerk, Supabase, Sanity, Paymob, Resend, PWA.

## الفجوات الرئيسية مقارنة بالمواصفات
1. **Dashboard BI متقدم**: widgets/charts/cohorts/geo غير مكتملة.
2. **Financial/Accounting**: P&L/Cashflow/Tax reports غير مكتملة.
3. **Invoice Lifecycle**: credit notes/void/export bulk/B2B terms غير مكتملة.
4. **CRM متقدم**: segmentation + churn + CLV + campaign automation.
5. **Shipping Orchestration**: zones engine + capacity + external couriers.
6. **Audit + Compliance**: immutable logs + privacy tooling أعمق.
7. **CMS Admin UX**: template editor bilingual + preview/test-send flows.

## خطة التنفيذ (Phases)

### Phase A — Foundation Hardening (سريع)
- [ ] توحيد أنواع الحالة بين DB/API (order/payment enums + constants).
- [ ] إكمال حراس الصلاحيات بكل endpoint إداري.
- [ ] ربط `audit_logs` فعليًا في mutations الحساسة.
- [ ] إغلاق إعدادات الإنتاج: Clerk/Supabase/Paymob/Resend على `cookie-bite.com` فقط.

### Phase B — Core Admin UX
- [ ] بناء صفحة Dashboard widgets + charts (Revenue/Orders/Status/Top Products).
- [ ] Product management advanced (variants matrix + bulk actions + low stock UX).
- [ ] Order operations board (kanban + bulk status update + packing export).
- [ ] Customer 360 profile + tags + notes + lifetime metrics.

### Phase C — Commerce Intelligence
- [ ] Discounts engine (stacking rules, limits, scope, automation).
- [ ] Loyalty tiers كاملة (earn/redeem/expiry/referrals/review bonus).
- [ ] Advanced analytics (AOV, CLV, churn, conversion funnel, cohort retention).

### Phase D — Financial & Compliance
- [ ] Financial reports (daily/monthly/yearly, gross/net margin, COGS).
- [ ] Invoice system advanced (credit notes, B2B, void, resend, bulk zip).
- [ ] Tax exports + reconciliation reports.
- [ ] GDPR tools (export/delete flows + consent logging).

### Phase E — Operations at Scale
- [ ] Shipping zones + SLA + surge + blackout/capacity limits.
- [ ] Gateway abstraction (Paymob + optional Stripe/Fawry/Wallet).
- [ ] Notification center orchestration (email/sms/whatsapp/push templates).
- [ ] Observability (error budgets, alerts, audit dashboards).

## DB Alignment المطلوب
هذه الجداول مطلوبة/موسعة لضمان تطابق كامل:
- `users`, `profiles`, `addresses`, `orders`, `order_items`, `products`, `product_variants`
- `invoices`, `payments`, `discounts`, `loyalty_transactions`, `reviews`
- `media`, `notifications`, `audit_logs`, `cms_blocks`, `shipping_zones`, `expenses`

> ملاحظة: يمكن تنفيذها تدريجيًا بمهاجرات additive دون كسر البيانات الحالية.

## معايير القبول
- كل endpoint إداري محمي RBAC + audit log.
- كل شاشة حرجة لها نسخة mobile usable.
- كل رسائل الخطأ API ثنائية اللغة `en/ar`.
- كل تدفقات الإنتاج تعمل على `cookie-bite.com` فقط.

## التنفيذ التالي مباشرة
الخطوة التالية المقترحة: **Phase A** في PR واحد صغير:
1. ربط audit logs في endpoints الإدارية.
2. middleware/backend guards توحيدًا.
3. checklist production sync (Clerk/Supabase/Paymob/Resend) جاهزة للتنفيذ.
