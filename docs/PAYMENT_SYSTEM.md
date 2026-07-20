# نظام الدفع في Cookie Bite — مرجع كامل

## 1. نظرة عامة

| البند | التفاصيل |
|--------|-----------|
| **بوابة الدفع الإلكتروني** | [Paymob Intention API](https://developers.paymob.com/paymob-docs/developers/intention-apis/create-intention) + Unified Checkout |
| **العملة** | EGP (جنيه مصري) |
| **نقطة الدخول للعميل** | `/checkout` |
| **API الرئيسي** | `POST /api/checkout/paymob/intention` |
| **تأكيد الدفع (سيرفر)** | `POST /api/webhooks/paymob` |
| **قاعدة البيانات** | Supabase — جدول `orders` + `order_items` |

المبدأ الأساسي: **الأسعار والمجاميع تُحسب على السيرفر فقط** — لا يُوثق بما يرسله المتصفح من أسعار.

---

## 2. طرق الدفع المدعومة

```typescript
"card" | "wallet" | "instapay" | "fawry" | "cod"
```

| الطريقة | النوع | السلوك |
|---------|-------|--------|
| **cod** | أوفلاين | دفع عند الاستلام — الطلب يُحفظ مباشرة |
| **instapay** | أوفلاين | تحويل يدوي — الطلب يُحفظ بحالة `unpaid` |
| **fawry** | أوفلاين | دفع فوري يدوي — نفس المسار |
| **card** | أونلاين | Paymob Unified Checkout (بطاقة) |
| **wallet** | أونلاين | Paymob Unified Checkout (محفظة) |

---

## 3. تدفق Checkout

```
Cart → Create Order (DB) → Create Paymob Intention → Redirect Unified Checkout
  → Payment → Webhook (HMAC) → Verify → Update Order → Success / Failed page
```

1. الواجهة ترسل `idempotency_key` لمنع الطلبات المكررة.
2. السيرفر يحفظ الطلب أولاً (`payment_status: unpaid`) ثم يستدعي Paymob.
3. `special_reference` = رقم الطلب الداخلي (`order_number`).
4. العميل يُوجَّه إلى:
   `https://accept.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=...`
5. Webhook هو مصدر الحقيقة لحالة `paid` / `failed`.

---

## 4. متغيرات البيئة

```env
PAYMOB_SECRET_KEY=          # Intention API (Authorization: Token ...)
PAYMOB_API_KEY=             # legacy Accept auth — مطلوب للاسترداد
PAYMOB_PUBLIC_KEY=          # Unified Checkout URL
PAYMOB_HMAC_SECRET=         # webhook + redirect HMAC (أو PAYMOB_HMAC)
PAYMOB_INTEGRATION_ID_CARD=
PAYMOB_INTEGRATION_ID_WALLET=
APP_BASE_URL=https://cookie-bite.com
```

- **notification_url**: `{APP_BASE_URL}/api/webhooks/paymob`
- **redirection_url**: `{APP_BASE_URL}/checkout/paymob-response`

---

## 5. مكتبة Paymob — `lib/paymob/`

| الملف | الدور |
|-------|------|
| `intention.ts` | `POST /v1/intention/` + billing/items helpers |
| `config.ts` | مفاتيح، URLs، فحص الجاهزية |
| `hmac.ts` | SHA-512 + timing-safe compare |
| `env.ts` | `PAYMOB_HMAC_SECRET` / legacy alias |
| `accept.ts` | legacy Accept auth + **refund** فقط |

---

## 6. Webhook

`POST /api/webhooks/paymob`

| Paymob | DB |
|--------|-----|
| `success=true` | `payment_status=paid`, `status=processing` |
| `pending=true` | يبقى `unpaid` / `pending` |
| `success=false` و غير pending | `payment_status=failed` |

- رفض HMAC غير صالح (`401`)
- لا تُخفَّض حالة طلب `paid` عند callback فشل متأخر
- منع تكرار الولاء عبر `becamePaid`

---

## 7. حالات الدفع في DB

`unpaid` | `paid` | `failed` | `refunded`

---

## 8. خريطة الملفات

```
app/(site)/checkout/page.tsx
app/(site)/checkout/paymob-response/page.tsx
app/(site)/checkout/thank-you/page.tsx
app/(site)/order-confirmation/page.tsx
app/api/checkout/paymob/intention/route.ts
app/api/webhooks/paymob/route.ts
lib/paymob/*
lib/db/orders.ts
```
