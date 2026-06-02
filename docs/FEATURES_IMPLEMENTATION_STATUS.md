# حالة تنفيذ الميزات — Cookie Bite

> المرجع الكامل: [`docs/features-implementation-guide.md`](./features-implementation-guide.md)  
> آخر مراجعة: يونيو 2026

## المرحلة 1 — مبيعات مباشرة

| # | الميزة | الحالة | ملاحظات |
|---|--------|--------|---------|
| 1 | جدولة التوصيل + مستلم منفصل | 🟢 منفّذ | migration `0038` + `/api/delivery-slots` + `DeliveryScheduler` في `/checkout` + حفظ على الطلب عبر Paymob/COD |
| 2 | إعادة طلب صندوق الهدايا | 🔴 غير منفذ | لا `gift_box_snapshot` ولا `/api/orders/[id]/reorder` |
| 3 | ربط Add-ons من المنتج (أدمن) | 🟢 أساسي | `linked_addon_ids` في `product-form-drawer` — يمكن تحسين البحث/المعاينة |
| 4 | سلة مهجورة | 🔴 غير منفذ | لا جدول `abandoned_carts` ولا Cron/Resend مخصص |

## المرحلة 2 — هدايا وولاء

| # | الميزة | الحالة |
|---|--------|--------|
| 5 | رابط مشاركة صندوق الهدايا | 🟡 `gift_boxes.share_token` موجود جزئياً |
| 6 | صفحة كشف الهدية | 🔴 |
| 7 | Mystery Box | 🔴 |
| 8 | قوالب المناسبات | 🔴 |
| 9 | لوحة الولاء | 🟡 API `/api/loyalty` — واجهة حساب محدودة |
| 10 | مكافآت مضاعفة على الصناديق | 🔴 |
| 11 | إحالة مرئية | 🟡 API موجود |
| 12 | لوحة مطبخ (أدمن) | 🔴 |
| 13 | تنبيهات عاجلة | 🟡 إشعارات staff جزئية |
| 14 | تقارير إضافات/صناديق | 🔴 |
| 15 | Mrs. Cookie للعملاء | 🟡 Mr Brownie / demo chat |

## المرحلة 3 — B2B

| # | الميزة | الحالة |
|---|--------|--------|
| 16 | B2B متعدد العناوين | 🔴 |
| 17 | كتالوج B2B + فواتير | 🟡 `/corporate-gifting` + فواتير أدمن |

---

## ما يُنفَّذ أولاً (مقترح)

1. **جدولة التوصيل** — migration + `/api/delivery-slots` + مكوّن checkout  
2. **إعادة طلب الصندوق** — `gift_box_snapshot` + reorder API + زر في الحساب  
3. **سلة مهجورة** — جدول + cron + بريد Resend  

---

## أوامر مفيدة

```bash
npm run type-check
npm run test
npm run deploy:github -- "feat: ..."
```
