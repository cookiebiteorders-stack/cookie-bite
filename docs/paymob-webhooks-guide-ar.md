# دليل شامل لإعداد Paymob Webhooks و Callbacks

## نظرة عامة

هذا الدليل يشرح كيفية إعداد نظام Paymob Payment Integration في مشروع Cookie Bite، بما في ذلك:
- أنواع الـ Callbacks
- الـ endpoints الموجودة
- HMAC verification
- إعداد البيئة
- ضبط URLs في Paymob Dashboard
- الاختبار والتصحيح

---

## أنواع الـ Callbacks في Paymob

### 1. Transaction Processed Callback (الأهم)

**النوع**: POST request (من السيرفر إلى السيرفر)  
**المحتوى**: JSON object  
**الغرض**: إشعارك بتفاصيل المعاملة بعد الدفع أو أي إجراء على الدفع  
**متى تستخدمه**: لتحديث حالة الطلب في قاعدة بياناتك  
**مصدر الحقيقة**: هذا هو المصدر الرسمي لحالة الدفع

**المفاتيح المهمة في JSON**:
```json
{
  "id": 316004,                    // Transaction ID
  "success": true,                 // حالة المعاملة (True/False)
  "order": {
    "id": 378804                   // Paymob order ID
  },
  "is_refunded": false,            // هل تم استرداد المال
  "is_voided": false,              // هل تم إلغاء المعاملة
  "is_captured": false,            // هل تم تحصيل المال
  "amount_cents": 50000,           // المبلغ بالعملة الصغرى (100 جنيه = 10000)
  "currency": "EGP"
}
```

### 2. Transaction Response Callback

**النوع**: GET request (مع Query Parameters)  
**الجهة**: من المتصفح إلى موقعك (Client-side)  
**الغرض**: إعادة توجيه العميل لصفحة تعرض حالة الدفع  
**متى تستخدمه**: لعرض رسالة للعميل (نجح الدفع/فشل)  
**ملاحظة**: للعرض فقط، ليس مصدر الحقيقة

**مثال URL**:
```
https://cookie-bite.com/checkout/paymob-response?id=316004&pending=false&amount_cents=50000&success=true&order=378804&hmac=...
```

### الفرق الجوهري

| Transaction Processed | Transaction Response |
|----------------------|---------------------|
| POST | GET |
| JSON | Query Params |
| Server-to-Server | Client-side |
| **مصدر الحقيقة** لحالة الدفع | للعرض فقط |

---

## الـ endpoints الموجودة في المشروع

### 1. Transaction Processed Callback Endpoint

**المسار**: `POST /api/webhooks/paymob`  
**الملف**: <ref_file file="C:\COOKIE BITE CURSOR\app\api\webhooks\paymob\route.ts" />

**ما يفعله**:
1. يستقبل JSON من Paymob
2. يتحقق من HMAC-SHA512
3. يستخرج `order.id` و `transaction.id`
4. يحدد outcome (paid/failed/pending)
5. يحدث حالة الطلب في Supabase
6. يرسل إشعارات (إيميل، WhatsApp) عند النجاح/الفشل
7. يمنح نقاط الولاء عند الدفع الناجح

**كود HMAC Verification**:
```typescript
import { verifyPaymobTransactionHmac } from "@/lib/paymob/hmac";

const transaction = (body.obj ?? body) as Record<string, unknown>;
const receivedHmac = resolveHmac(req, body, transaction);

if (!verifyPaymobTransactionHmac(transaction, receivedHmac, secret)) {
  return new Response("Invalid HMAC", { status: 401 });
}
```

### 2. Transaction Response Callback Endpoint

**المسار**: `GET /checkout/paymob-response`  
**الملف**: <ref_file file="C:\COOKIE BITE CURSOR\app\(site)\checkout\paymob-response\page.tsx" />

**ما يفعله**:
1. يستقبل query parameters من Paymob redirect
2. يتحقق من HMAC (اختياري)
3. يحدد حالة الدفع (success/failed/pending)
4. يوجه العميل لصفحة مناسبة:
   - `/order-confirmation` إذا نجح الدفع
   - `/checkout/thank-you?status=failed` إذا فشل
   - `/checkout/thank-you?status=pending` إذا معلق

### 3. Create Intention Endpoint

**المسار**: `POST /api/checkout/paymob/intention`  
**الملف**: <ref_file file="C:\COOKIE BITE CURSOR\app\api\checkout\paymob\intention\route.ts" />

**ما يفعله**:
1. يستقبل بيانات الطلب (items, shipping, promo_code)
2. ينشئ order في Supabase
3. يبني Paymob Intention payload
4. يستدعي Paymob Intention API
5. يرجع `clientSecret` و `paymentUrl` للواجهة الأمامية

---

## HMAC Verification

### ما هو HMAC؟

HMAC (Hash-based Message Authentication Code) هو آلية أمان تتحقق أن الـ callback قادم فعلاً من Paymob وليس من hacker.

### HMAC Types في Paymob

#### 1. Transaction Callback HMAC (20 fields)

**الملف**: <ref_file file="C:\COOKIE BITE CURSOR\lib\paymob\hmac.ts" lines="25-54" />

**الحقول بالترتيب المطلوب**:
```
amount_cents + created_at + currency + error_occured + has_parent_transaction + 
id + integration_id + is_3d_secure + is_auth + is_capture + is_refunded + 
is_standalone_payment + is_voided + order.id + owner + pending + 
source_data.pan + source_data.sub_type + source_data.type + success
```

**كود الحساب**:
```typescript
export function computePaymobTransactionHmac(
  transaction: Record<string, unknown>,
  secret: string,
): string {
  const order = (transaction.order ?? {}) as Record<string, unknown>;
  const sourceData = (transaction.source_data ?? {}) as Record<string, unknown>;
  const connected =
    str(transaction.amount_cents) +
    str(transaction.created_at) +
    str(transaction.currency) +
    str(transaction.error_occured) +
    str(transaction.has_parent_transaction) +
    str(transaction.id) +
    str(transaction.integration_id) +
    str(transaction.is_3d_secure) +
    str(transaction.is_auth) +
    str(transaction.is_capture) +
    str(transaction.is_refunded) +
    str(transaction.is_standalone_payment) +
    str(transaction.is_voided) +
    str(order.id) +
    str(transaction.owner) +
    str(transaction.pending) +
    str(sourceData.pan) +
    str(sourceData.sub_type) +
    str(sourceData.type) +
    str(transaction.success);

  return crypto.createHmac("sha512", secret).update(connected).digest("hex");
}
```

#### 2. Response Callback HMAC (GET query params)

**الملف**: <ref_file file="C:\COOKIE BITE CURSOR\lib\paymob\hmac.ts" lines="70-100" />

**الحقول بالترتيب المطلوب**:
```
amount_cents + created_at + currency + error_occured + has_parent_transaction + 
id + integration_id + is_3d_secure + is_auth + is_capture + is_refunded + 
is_standalone_payment + is_voided + order + owner + pending + 
source_data.pan + source_data.sub_type + source_data.type + success
```

**ملاحظة**: الفرق في `order.id` → `order` (كـ query param)

### التحقق Timing-Safe

يستخدم المشروع `crypto.timingSafeEqual` لمنع timing attacks:

```typescript
function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a.toLowerCase(), "utf8");
    const bufB = Buffer.from(b.toLowerCase(), "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
```

---

## إعداد البيئة (.env)

### المتغيرات المطلوبة

**الملف**: <ref_file file="C:\COOKIE BITE CURSOR\.env.example" lines="47-61" />

```bash
# Paymob (Payments) — https://accept.paymob.com
PAYMOB_SECRET_KEY=sk_test_...          # Secret Key (Intention API)
PAYMOB_API_KEY=                        # API Key (Legacy/Refunds)
PAYMOB_PUBLIC_KEY=pk_test_...          # Public Key (Unified Checkout)
PAYMOB_HMAC_SECRET=...                # HMAC Secret (Webhook verification)
PAYMOB_INTEGRATION_ID_CARD=5765742    # Card Integration ID
PAYMOB_INTEGRATION_ID_WALLET=5765741   # Wallet Integration ID
PAYMOB_API_URL=https://accept.paymob.com  # Optional (defaults to Egypt)
```

### من أين تحصل على هذه القيم؟

1. **Secret Key & Public Key**: 
   - سجل في Paymob Dashboard
   - اذهب إلى Settings → Account Settings → API Key
   - ستجد Secret Key (ابدأ بـ `sk_`) و Public Key (ابدأ بـ `pk_`)

2. **HMAC Secret**:
   - في Paymob Dashboard
   - اذهب إلى Settings → Account Settings → HMAC Secret
   - انسخ الـ HMAC Secret

3. **Integration IDs**:
   - في Paymob Dashboard
   - اذهب إلى Developers → Integrations
   - ستجد Integration ID لكل payment method (Card, Wallet, etc.)

4. **API Key (Legacy)**:
   - قد لا تحتاجه في Intention API الجديد
   - يستخدم لبعض العمليات القديمة مثل Refunds

### قواعد الأمان المهمة

⚠️ **أهم قاعدة**: لا تستخدم `NEXT_PUBLIC_` prefix للمتغيرات السرية!

- ❌ `NEXT_PUBLIC_PAYMOB_SECRET_KEY` → **خطر أمني**
- ✅ `PAYMOB_SECRET_KEY` → صحيح (server-only)

السبب: أي متغير يبدأ بـ `NEXT_PUBLIC_` يتم تضمينه في bundle المتصفح، مما يعرض السر للعامة.

---

## ضبط URLs في Paymob Dashboard

### 1. Transaction Processed Callback URL

**اذهب إلى**: Paymob Dashboard → Developers → Integrations → اختر Integration → Webhooks

**أضف الـ URL**:
```
https://cookie-bite.com/api/webhooks/paymob
```

**ملاحظات**:
- يجب أن يكون HTTPS (للإنتاج)
- للاختبار المحلي، استخدم ngrok أو webhook.site
- هذا URL يستقبل POST requests مع JSON

### 2. Transaction Response Callback URL

هذا يتم ضبطه في Intention API، ليس في Dashboard.

**الكود في المشروع**:
```typescript
// lib/paymob/config.ts
export function paymobRedirectionUrl(): string {
  return `${resolveAppBaseUrl()}/checkout/paymob-response`;
}
```

**القيمة**:
```
https://cookie-bite.com/checkout/paymob-response
```

### 3. Notification URL (Transaction Processed)

يتم ضبطه أيضاً في Intention API:

```typescript
// lib/paymob/config.ts
export function paymobNotificationUrl(): string {
  return `${resolveAppBaseUrl()}/api/webhooks/paymob`;
}
```

---

## Flow الكامل للدفع

```
1. العميل يضغط "Checkout" في الموقع
   ↓
2. Frontend يستدعي POST /api/checkout/paymob/intention
   ↓
3. السيرفر ينشئ order في Supabase
   ↓
4. السيرفر يستدعي Paymob Intention API (POST /v1/intention/)
   ↓
5. Paymob يرجع clientSecret و paymentUrl
   ↓
6. Frontend يوجه العميل لصفحة Paymob Unified Checkout
   ↓
7. العميل يدفع (Card/Wallet)
   ↓
8. Paymob يرسل POST إلى /api/webhooks/paymob (Transaction Processed)
   - يتحقق من HMAC
   - يحدث حالة الطلب في Supabase
   - يرسل إشعارات
   ↓
9. Paymob يعيد توجيه العميل لـ /checkout/paymob-response (GET)
   - يعرض رسالة النجاح/الفشل
   ↓
10. العميل يرى صفحة Thank You أو Order Confirmation
```

---

## الاختبار والتصحيح

### 1. اختبار محلي مع ngrok

**تثبيت ngrok**:
```bash
# Windows (via scoop)
scoop install ngrok

# أو من https://ngrok.com/download
```

**تشغيل ngrok**:
```bash
ngrok http 3000
```

**ستحصل على URL مثل**: `https://abc123.ngrok.io`

**استخدمه في Paymob Dashboard**:
```
https://abc123.ngrok.io/api/webhooks/paymob
```

### 2. استخدام webhook.site

1. اذهب إلى https://webhook.site
2. ستحصل على URL عشوائي
3. ضعه في Paymob Dashboard كـ webhook URL
4. شاهد الـ callbacks القادمة
5. انسخ الـ HMAC وقم بفحصه يدوياً

### 3. اختبار HMAC Verification

**سكربت موجود**: <ref_file file="C:\COOKIE BITE CURSOR\scripts\test-paymob-webhook.mjs" />

```bash
node scripts/test-paymob-webhook.mjs
```

### 4. فحص logs

افتح browser console أو server logs وشاهد:
- `Paymob webhook: HMAC mismatch` → مشكلة في HMAC
- `Paymob webhook: order not found` → order ID غير موجود في Supabase
- `Paymob redirect: HMAC mismatch` → مشكلة في response HMAC

### 5. فحص Supabase

افتح Supabase Dashboard → Table Editor → `orders`

ابحث عن order وافحص:
- `payment_status`: `paid`, `pending`, `failed`, `refunded`
- `paymob_accept_order_id`: يجب أن يطابق Paymob order ID
- `paymob_transaction_id`: يجب أن يطابق Paymob transaction ID

---

## المشاكل الشائعة والحلول

### المشكلة 1: Webhook لا يصل

**الأسباب المحتملة**:
- URL غير صحيح في Paymob Dashboard
- Firewall يحجب الـ requests
- HTTPS مطلوب للإنتاج

**الحل**:
1. تأكد من URL صحيح: `https://yourdomain.com/api/webhooks/paymob`
2. استخدم webhook.site للاختبار
3. تحقق من server logs
4. تأكد من أن الـ endpoint يرجع 200 OK

### المشكلة 2: HMAC mismatch

**الأسباب المحتملة**:
- `PAYMOB_HMAC_SECRET` غير صحيح في .env
- ترتيب الحقول خاطئ
- اختلاف بين test/live keys

**الحل**:
1. تحقق من `PAYMOB_HMAC_SECRET` في .env
2. تأكد من استخدام Test Mode keys مع Test Mode
3. تأكد من ترتيب الحقول مطابق للتوثيق
4. استخدم سكربت الاختبار: `node scripts/test-paymob-webhook.mjs`

### المشكلة 3: Order not found

**الأسباب المحتملة**:
- Order لم يُنشأ في Supabase قبل Paymob callback
- `paymob_accept_order_id` غير محفوظ بشكل صحيح

**الحل**:
1. تحقق من أن intention endpoint ينشئ order قبل استدعاء Paymob
2. تحقق من `updatePaymobAcceptOrderId` يُنفذ بشكل صحيح
3. فحص Supabase للبحث عن order

### المشكلة 4: Client-side redirect فشل

**الأسباب المحتملة**:
- Response URL غير صحيح
- HMAC verification فشل

**الحل**:
1. تحقق من `APP_BASE_URL` في .env
2. تحقق من أن redirection URL صحيح في intention
3. اختبر HMAC verification للـ response

---

## Environment Matching

**قاعدة مهمة**: Integration ID يجب أن يطابق environment (Test/Live) للـ Secret Key

| Environment | Secret Key | Integration ID |
|-------------|------------|----------------|
| Test | `sk_test_...` | Test Mode Integration ID |
| Live | `sk_live_...` | Live Mode Integration ID |

⚠️ **تحذير**: استخدام Test Integration ID مع Live Secret Key (أو العكس) سيرجع 404 عند إنشاء intention.

---

## Migration المطلوبة

لا يوجد migration جديد مطلوب لأن schema موجود بالفعل.

**Migration الحالي**: <ref_file file="C:\COOKIE BITE CURSOR\supabase\migrations\0002_orders_paymob.sql" />

يحتوي على:
- `paymob_accept_order_id` column
- `paymob_transaction_id` column
- `payment_status` column

---

## التحقق من الإعداد

### 1. فحص Config Status

**استخدم endpoint**: `GET /api/admin/settings/integrations`

سيرجع:
```json
{
  "paymob": {
    "secretKey": true,
    "publicKey": true,
    "hmacSecret": true,
    "integrationCard": true,
    "integrationWallet": true,
    "appBaseUrl": true
  }
}
```

يجب أن تكون جميع القيم `true`.

### 2. فحص Environment Variables

```bash
# في development
grep PAYMOB .env.local

# في production
grep PAYMOB .env
```

تأكد من أن جميع المتغيرات موجودة وليست فارغة.

### 3. اختبار End-to-End

1. اذهب إلى Cart في الموقع
2. اضغط Checkout
3. اختر Card أو Wallet
4. أكمل الدفع في Paymob test page
5. تحقق من:
   - Webhook يصل (server logs)
   - Order في Supabase يحدث لـ `payment_status=paid`
   - العميل يُوجه لصفحة Order Confirmation
   - إشعار وصل (إيميل/WhatsApp)

---

## المستندات المرجعية

- [Paymob Transaction Callbacks](https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac/transaction-callbacks)
- [Paymob HMAC Documentation](https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac/hmac)
- [Paymob Create Intention](https://developers.paymob.com/paymob-docs/developers/intention-apis/create-intention)
- [Paymob Integration Skill](https://github.com/PaymobAccept/Paymob-AI-Integration-Skill)

---

## الخلاصة

المشروع لديه implement Paymob كامل وصحيح:
- ✅ Transaction Processed webhook endpoint مع HMAC verification
- ✅ Transaction Response redirect endpoint
- ✅ Intention API endpoint
- ✅ HMAC-SHA512 verification (timing-safe)
- ✅ Order status updates في Supabase
- ✅ Notifications (إيميل، WhatsApp، نقاط ولاء)

**الخطوات التالية**:
1. تأكد من .env variables صحيحة
2. ضبط URLs في Paymob Dashboard
3. اختبار مع ngrok أو webhook.site
4. اختبار end-to-end في environment
5. مراقبة logs و Supabase للتأكد من النجاح
