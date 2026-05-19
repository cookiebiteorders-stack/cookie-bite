# Cookie Bite — WhatsApp Bridge

خادم اختياري يعتمد على [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) لإرسال رسائل واتساب **بدون** Meta Cloud API.

## متى تستخدمه؟

| الطريقة | متى |
|--------|-----|
| **Meta Cloud API** (`WHATSAPP_CLOUD_API_TOKEN`) | الإنتاج الرسمي — قوالب معتمدة |
| **هذا الجسر** (`WHATSAPP_BRIDGE_URL`) | تطوير، أو عند عدم توفر حساب Meta Business |

موقع Cookie Bite يحاول **Meta أولاً**، ثم الجسر تلقائياً إن وُجد `WHATSAPP_BRIDGE_URL`.

## التشغيل محلياً

```bash
cd services/whatsapp-bridge
npm install
cp .env.example .env
npm start
```

1. امسح QR Code في الطرفية بحساب واتساب المتجر.
2. تحقق: `http://localhost:3000/status`

## ربط الموقع (Next.js / Hostinger)

في `.env` للموقع:

```env
WHATSAPP_BRIDGE_URL=http://127.0.0.1:3000
WHATSAPP_BRIDGE_SECRET=نفس-القيمة-على-الخادمين
```

على Render أو VPS شغّل الجسر كخدمة منفصلة وضع الرابط العام في `WHATSAPP_BRIDGE_URL`.

## نقاط النهاية (40+ قالب)

أمثلة:

- `POST /send/order-confirm` — تأكيد الطلب
- `POST /send/shipped` — شحن
- `POST /send/invoice` — فاتورة
- `POST /send/raw` — نص حر `{ phone, message }`
- `GET /status` — حالة الاتصال

القائمة الكاملة في ملف المصدر `whatsapp_server_full.txt` أو تعليقات `server.mjs`.

## أمان

- عيّن `WHATSAPP_BRIDGE_SECRET` على الجسر والموقع.
- لا تعرّض المنفذ للإنترنت بدون secret وبدون جدار ناري.

## ملاحظات

- whatsapp-web.js **غير رسمي** — قد ينقطع الاتصال؛ أعد المسح عند الحاجة.
- للإنتاج طويل الأمد يُفضّل Meta WhatsApp Business API.
