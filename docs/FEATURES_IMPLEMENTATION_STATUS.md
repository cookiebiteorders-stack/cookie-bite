# حالة تنفيذ الميزات — Cookie Bite

> المرجع الكامل: [`docs/features-implementation-guide.md`](./features-implementation-guide.md)  
> آخر مراجعة: يونيو 2026

## المرحلة 1 — مبيعات مباشرة

| # | الميزة | الحالة | ملاحظات |
|---|--------|--------|---------|
| 1 | جدولة التوصيل + مستلم منفصل | 🟢 منفّذ | migration `0038` + `/api/delivery-slots` + `DeliveryScheduler` في `/checkout` + حفظ على الطلب عبر Paymob/COD |
| 2 | إعادة طلب صندوق الهدايا | 🟢 منفّذ | migration `0039` + snapshot عند الدفع + `POST /api/orders/[id]/reorder` + زر «أعد نفس الصندوق» في الحساب |
| 3 | ربط Add-ons من المنتج (أدمن) | 🟢 أساسي | `linked_addon_ids` في `product-form-drawer` — يمكن تحسين البحث/المعاينة |
| 4 | سلة مهجورة | 🟢 منفّذ | migration `0040` + `/api/cart/abandon` + `/cart/recover/[token]` + cron `/api/cron/abandoned-cart-reminders` + قالب Resend |

## المرحلة 2 — هدايا وولاء

| # | الميزة | الحالة |
|---|--------|--------|
| 5 | رابط مشاركة صندوق الهدايا | 🟢 منفّذ | migration `0041` + `POST /api/gift-box/share` + `/gift-preview/[token]` + زر مشاركة في المنشئ |
| 6 | صفحة كشف الهدية | 🟢 منفّذ | migration `0042` + `GET/PATCH /api/orders/reveal/[token]` + `/gift-reveal/[token]` + زر «Reveal link» في الحساب |
| 7 | Mystery Box | 🟢 منفّذ | migration `0043` + `POST /api/mystery-box/generate` + `/mystery-box` + إضافة للسلة كصندوق هدية |
| 8 | قوالب المناسبات | 🟢 منفّذ | migration `0044` + `GET /api/occasion-templates` + شريط قوالب في `/gift-box/build` |
| 9 | لوحة الولاء | 🟢 `LoyaltyDashboard` في `/account` + `/api/loyalty` |
| 10 | مكافآت مضاعفة على الصناديق | 🟢 `awardLoyaltyPointsForPaidOrder` ×2 لـ `gift_box` |
| 11 | إحالة مرئية | 🟢 كود + تطبيق في لوحة الولاء |
| 12 | لوحة مطبخ (أدمن) | 🟢 `/admin/kitchen` + `/api/admin/kitchen/orders` |
| 13 | تنبيهات عاجلة | 🟢 `isUrgentOrder` في لوحة الطلبات |
| 14 | تقارير إضافات/صناديق | 🟢 `/api/admin/reports/gift-addon-insights` + لوحة التقارير |
| 15 | Mrs. Cookie للعملاء | 🟡 Mr Brownie / demo chat |

## المرحلة 3 — B2B

| # | الميزة | الحالة |
|---|--------|--------|
| 16 | B2B متعدد العناوين | 🟢 migration `0047` + `/api/corporate/bulk-delivery` + نموذج في `/corporate-gifting` |
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
