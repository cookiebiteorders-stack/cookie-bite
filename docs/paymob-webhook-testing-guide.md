# Paymob Webhook Testing Guide - All Environments

هذا الدليل يشرح كيفية اختبار Paymob webhooks في ثلاثة سيناريوهات:
1. **Development المحلي** باستخدام ngrok
2. **الاختبار السريع** باستخدام webhook.site
3. **الإنتاج** باستخدام URL حقيقي للموقع

---

## الخيار 1: Development المحلي باستخدام ngrok

### التثبيت

ngrok مثبت بالفعل على جهازك! ✅

### الاستخدام

#### الخطوة 1: تشغيل التطبيق المحلي

```bash
# Terminal 1
npm run dev
```

#### الخطوة 2: تشغيل ngrok

```bash
# Terminal 2 (قد تحتاج لإعادة تشغيل terminal لتحديث PATH)
ngrok http 3000
```

ستحصل على output مثل:
```
ngrok by @inconshreveable

Session Status                online
Account                       your-account
Version                       3.3.1
Region                        United States (us)
Forwarding                    https://abc123-def456.ngrok-free.app -> http://localhost:3000
```

**الـ URL المهم**: `https://abc123-def456.ngrok-free.app`

#### الخطوة 3: تحديث Paymob Dashboard

اذهب إلى Paymob Dashboard → Developers → Integrations

**للـ Card Integration (#5777362)**:
- Webhook URL: `https://abc123-def456.ngrok-free.app/api/webhooks/paymob`
- Redirect URL: `https://abc123-def456.ngrok-free.app/checkout/paymob-response`

**للـ Wallet Integration (#5777363)**:
- Webhook URL: `https://abc123-def456.ngrok-free.app/api/webhooks/paymob`
- Redirect URL: `https://abc123-def456.ngrok-free.app/checkout/paymob-response`

#### الخطوة 4: اختبار الدفع

1. اذهب إلى `http://localhost:3000`
2. أضف منتجات للسلة
3. اذهب لـ Checkout
4. اختر Card أو Wallet
5. أكمل الدفع في Paymob test page
6. راقب ngrok terminal للـ webhook requests
7. راقب server logs للتأكد من استلام webhook

#### الخطوة 5: فحص logs

في ngrok terminal، سترى requests مثل:
```
HTTP Request
POST /api/webhooks/paymob
```

في server logs، سترى:
```
Paymob webhook: HMAC verified
Order updated: payment_status=paid
```

### ميزات ngrok
- ✅ tunnel آمن (HTTPS)
- ✅ requests real-time في terminal
- ✅ إعادة استخدام نفس URL في كل session
- ✅ يدعم custom domains (نسخة مدفوعة)

### عيوب ngrok
- ❌ يتطلب تشغيل continuously
- ❌ URL يتغير عند إعادة التشغيل (إلا مع account)
- ❌ للإنتاج، يجب استخدام URL حقيقي

---

## الخيار 2: الاختبار السريع باستخدام webhook.site

### ما هو webhook.site؟

خدمة مجانية توفر URL مؤقت لاستقبال webhooks وعرضها في المتصفح.

### الاستخدام

#### الخطوة 1: إنشاء webhook URL

1. اذهب إلى https://webhook.site
2. ستحصل على URL فريد مثل:
   ```
   https://webhook.site/your-unique-id
   ```

#### الخطوة 2: تحديث Paymob Dashboard

استخدم هذا URL مؤقتاً:
```
https://webhook.site/your-unique-id/api/webhooks/paymob
```

⚠️ **ملاحظة**: webhook.site لا يدعم paths، لذا ستحتاج لتعديل:
- استخدم: `https://webhook.site/your-unique-id`
- ثم راقب الـ payload وانسخه للاختبار يدوياً

#### الخطوة 3: اختبار الدفع

1. أكمل عملية دفع في Paymob
2. عد إلى webhook.site
3. سترى الـ webhook callback
4. انسخ الـ JSON payload
5. استخدم سكربت الاختبار للتحقق من HMAC

#### الخطوة 4: اختبار HMAC يدوياً

```bash
# استخدم سكربت الاختبار
node scripts/test-paymob-webhook.mjs
```

### ميزات webhook.site
- ✅ لا يتطلب تثبيت
- ✅ سهل الاستخدام
- ✅ يعرض payload فوراً
- ✅ مفيد لفحص structure

### عيوب webhook.site
- ❌ لا يستدعي server الخاص بك
- ❌ لا يمكن اختبار end-to-end
- ❌ يجب اختبار HMAC يدوياً
- ❌ للفحص فقط، ليس للاختبار الكامل

---

## الخيار 3: الإنتاج باستخدام URL حقيقي

### الإعداد للإنتاج

#### الخطوة 1: تحديث Environment Variables

في `.env` (Production):
```bash
APP_BASE_URL=https://cookie-bite.com
NEXT_PUBLIC_APP_URL=https://cookie-bite.com
NEXT_PUBLIC_SITE_URL=https://cookie-bite.com
```

#### الخطوة 2: تحديث Paymob Dashboard

**للـ Card Integration (#5777362)**:
- Webhook URL: `https://cookie-bite.com/api/webhooks/paymob`
- Redirect URL: `https://cookie-bite.com/checkout/paymob-response`

**للـ Wallet Integration (#5777363)**:
- Webhook URL: `https://cookie-bite.com/api/webhooks/paymob`
- Redirect URL: `https://cookie-bite.com/checkout/paymob-response`

#### الخطوة 3: التأكد من HTTPS

- ✅ الموقع يستخدم HTTPS
- ✅ SSL certificate صحيح
- ✅ لا يوجد firewall يحجب Paymob IPs

#### الخطوة 4: نشر التغييرات

```bash
# Commit التغييرات
git add .
git commit -m "feat: update Paymob webhook URLs for production"

# Deploy
npm run deploy:github
```

#### الخطوة 5: اختبار في الإنتاج

1. اذهب إلى `https://cookie-bite.com`
2. أجري اختبار دفع حقيقي (مبلغ صغير)
3. راقب logs في production server
4. تحقق من Supabase لتحديث الطلب
5. تأكد من وصول الإشعارات

### ميزات الإنتاج
- ✅ URL ثابت ودائم
- ✅ لا يتطلب تشغيل إضافي
- ✅ end-to-end test حقيقي
- ✅ SSL/HTTPS آمن

### عيوب الإنتاج
- ❌ لا يمكن اختبار في local
- ❌ يتطلب deployment
- ❌ تكلفة إذا اختبار بأموال حقيقية

---

## مقارنة الخيارات الثلاثة

| الميزة | ngrok (Local) | webhook.site | Production |
|--------|---------------|--------------|------------|
| سهولة الإعداد | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| end-to-end test | ✅ | ❌ | ✅ |
| real server invocation | ✅ | ❌ | ✅ |
| HTTPS | ✅ | ✅ | ✅ |
| مجاني | ✅ (معlimits) | ✅ | ✅ |
| للإنتاج | ❌ | ❌ | ✅ |
| requires installation | ✅ | ❌ | ❌ |
| URL ثابت | ❌ (معaccount) | ❌ | ✅ |

---

## الاستراتيجية الموصى بها

### Phase 1: Development
استخدم **ngrok** للاختبار المحلي:
```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
```

### Phase 2: Quick Verification
استخدم **webhook.site** لفحص payload structure:
1. أضف webhook.site URL في Paymob
2. اجرِ دفع
3. راقب payload في webhook.site
4. تحقق من الحقول المطلوبة

### Phase 3: Staging (اختياري)
إذا كان لديك بيئة staging:
```
https://staging.cookie-bite.com/api/webhooks/paymob
```

### Phase 4: Production
استخدم **URL حقيقي**:
```
https://cookie-bite.com/api/webhooks/paymob
```

---

## التحقق من نجاح Webhook

### 1. في ngrok Terminal
ابحث عن:
```
HTTP Request
POST /api/webhooks/paymob
200 OK
```

### 2. في Server Logs
ابحث عن:
```
Paymob webhook: HMAC verified
Order updated: payment_status=paid
```

### 3. في Supabase
افتح Table Editor → `orders`:
- `payment_status` = `paid`
- `paymob_accept_order_id` مطابق Paymob
- `paymob_transaction_id` موجود

### 4. في Paymob Dashboard
اذهب إلى Transactions:
- Transaction status = Success
- Order ID مطابق

---

## مشاكل شائعة وحلولها

### المشكلة: ngrok URL يتغير عند كل إعادة تشغيل

**الحل**:
1. سجل في https://ngrok.com (مجاني)
2. احصل على auth token
3. تشغيل:
```bash
ngrok config add-authtoken YOUR_TOKEN
ngrok http 3000
```
الآن ستحصل على subdomain ثابت.

### المشكلة: webhook.site لا يستدعي server

**الحل**: هذا طبيعي - webhook.site للفحص فقط. استخدم ngrok للاختبار الكامل.

### المشكلة: Production webhook لا يصل

**الحل**:
1. تحقق من URL صحيح: `https://cookie-bite.com/api/webhooks/paymob`
2. تحقق من HTTPS يعمل
3. تحقق من firewall لا يحجب Paymob
4. راقب production server logs

### المشكلة: HMAC mismatch في الإنتاج

**الحل**:
1. تحقق من `PAYMOB_HMAC_SECRET` في production `.env`
2. تأكد من استخدام Live Mode keys (sk_live_)
3. تحقق من environment match

---

## Script سريع للاختبار

### Script لتشغيل ngrok + التطبيق

أنشئ `scripts/dev-with-ngrok.bat`:
```batch
@echo off
start "Dev Server" cmd /k "npm run dev"
timeout /t 3
ngrok http 3000
```

ثم:
```bash
scripts/dev-with-ngrok.bat
```

---

## الخلاصة

✅ **ngrok مثبت وجاهز** للاختبار المحلي
✅ **webhook.site** متاح للاختبار السريع
✅ **Production URL** جاهز عند النشر

**الخطوة التالية**: اختر الخيار المناسب لمرحلتك الحالية وابدأ الاختبار!
