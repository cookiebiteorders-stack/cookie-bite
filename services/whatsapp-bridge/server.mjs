require("dotenv").config();
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET?.trim();
const PORT = Number(process.env.WHATSAPP_BRIDGE_PORT || 3000);

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
app.use(express.json());
// Optional API secret (set WHATSAPP_BRIDGE_SECRET on bridge + Next.js)
app.use((req, res, next) => {
  if (!BRIDGE_SECRET || req.path === "/status") return next();
  const key =
    req.headers["x-bridge-secret"] ||
    (typeof req.headers.authorization === "string"
      ? req.headers.authorization.replace(/^Bearer\s+/i, "")
      : "");
  if (key !== BRIDGE_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
});


// ─────────────────────────────────────────
// WHATSAPP CLIENT SETUP
// ─────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('>>> Scan this QR Code with your WhatsApp <<<');
});

client.on('ready', () => {
  console.log('✅ WhatsApp is connected and ready!');
});

client.on('disconnected', reason => {
  console.log('❌ Disconnected:', reason);
});

client.initialize();

// ─────────────────────────────────────────
// HELPER FUNCTION
// ─────────────────────────────────────────
async function sendWA(phone, message) {
  const chatId = phone.replace(/[^0-9]/g, '') + '@c.us';
  try {
    await client.sendMessage(chatId, message);
    console.log(`✅ Message sent to ${phone}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to send to ${phone}:`, err.message);
    return false;
  }
}

// ─────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────
app.get('/status', (req, res) => {
  res.json({ status: 'running', whatsapp: client.info ? 'connected' : 'disconnected' });
});

// POST /send/raw — generic text (used by Cookie Bite Next.js fallback)
// Body: { phone, message }
app.post('/send/raw', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ success: false, error: 'phone and message required' });
  }
  const ok = await sendWA(phone, message);
  res.json({ success: ok });
});


// ================================================================
// ① CUSTOMER EMAILS — TRANSACTIONAL
// ================================================================

// ─── 1. WELCOME MESSAGE ───────────────────────────────────────
// POST /send/welcome
// Body: { phone, name, promoCode }
app.post('/send/welcome', async (req, res) => {
  const { phone, name, promoCode = 'WELCOME10' } = req.body;
  const msg =
`👋 *مرحباً بك في Cookie Bite، ${name}!*

يسعدنا انضمامك لعائلتنا. حسابك جاهز الآن.

🎁 هدية ترحيبية خاصة لك:
استخدم كود *${promoCode}* للحصول على *10% خصم* على أول طلب!

🛒 تسوق الآن:
https://cookie-bite.com/shop

_صالح لمدة 30 يوم. نتمنى تجربة تسوق ممتعة!_ ✨`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 2. ORDER CONFIRMATION ────────────────────────────────────
// POST /send/order-confirm
// Body: { phone, name, orderNumber, orderDate, total, items, address, paymentMethod }
app.post('/send/order-confirm', async (req, res) => {
  const { phone, name, orderNumber, orderDate, total, items = [], address, paymentMethod } = req.body;
  const itemLines = items.map(i => `• ${i.name} x${i.qty} — ${i.price}`).join('\n') || '• {{products}}';
  const msg =
`✅ *تأكيد الطلب!*

مرحباً ${name}، شكراً جزيلاً على طلبك.

📦 *رقم الطلب:* #${orderNumber}
🗓️ *تاريخ الطلب:* ${orderDate}
💳 *طريقة الدفع:* ${paymentMethod}

*المنتجات:*
${itemLines}

💰 *الإجمالي:* ${total}
📍 *الشحن إلى:* ${address}

تابع طلبك:
https://cookie-bite.com/track

_شكراً لثقتك بنا! 🛍️_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 3. ORDER SHIPPED ─────────────────────────────────────────
// POST /send/shipped
// Body: { phone, name, orderNumber, carrier, trackingNumber, estimatedDelivery, trackingLink }
app.post('/send/shipped', async (req, res) => {
  const { phone, name, orderNumber, carrier, trackingNumber, estimatedDelivery, trackingLink = 'https://cookie-bite.com/track' } = req.body;
  const msg =
`🚚 *طلبك في الطريق!*

مرحباً ${name}! بشرى سارة — تم شحن طلبك.

📦 *رقم الطلب:* #${orderNumber}
🏢 *شركة الشحن:* ${carrier}
🔢 *رقم التتبع:* ${trackingNumber}
📅 *التسليم المتوقع:* ${estimatedDelivery}

تتبع الشحنة هنا:
${trackingLink}

_سنخبرك فور وصول طلبك! 📬_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 4. ORDER DELIVERED ───────────────────────────────────────
// POST /send/delivered
// Body: { phone, name, orderNumber, deliveryDate, address, returnWindow, supportLink }
app.post('/send/delivered', async (req, res) => {
  const { phone, name, orderNumber, deliveryDate, address, returnWindow = '14', supportLink = 'https://cookie-bite.com/contact' } = req.body;
  const msg =
`🎉 *طلبك وصل!*

مرحباً ${name}!
تم تسليم طلبك *#${orderNumber}* بتاريخ *${deliveryDate}*.

📍 *تسليم إلى:* ${address}

نأمل أن تعجبك مشترياتك! إذا كان هناك أي مشكلة، لديك *${returnWindow} يوماً* لإرجاع المنتجات.

تحتاج مساعدة؟
${supportLink}

_استمتع بمشترياتك! ⭐_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 5. ORDER CANCELLED ───────────────────────────────────────
// POST /send/cancelled
// Body: { phone, name, orderNumber, orderDate, orderTotal, refundAmount, paymentMethod, processingDays, cancelReason, storeLink }
app.post('/send/cancelled', async (req, res) => {
  const { phone, name, orderNumber, orderDate, orderTotal, refundAmount, paymentMethod, processingDays = '3-5', cancelReason, storeLink = 'https://cookie-bite.com/shop' } = req.body;
  const msg =
`❌ *تم إلغاء الطلب*

مرحباً ${name}، تم إلغاء طلبك *#${orderNumber}* بنجاح.

📅 *تاريخ الطلب:* ${orderDate}
💰 *قيمة الطلب:* ${orderTotal}
💳 *المبلغ المسترد:* ${refundAmount}
🏦 *إلى:* ${paymentMethod}
⏳ *مدة الاسترداد:* ${processingDays} أيام عمل

_السبب: ${cancelReason}_

هل تريد طلب شيء آخر؟
${storeLink}

_نحن هنا لمساعدتك في أي وقت._`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 6. SHIPPING DELAY ────────────────────────────────────────
// POST /send/delay
// Body: { phone, name, orderNumber, originalDate, newDate, delayReason, trackingNumber, carrier, apologyCode, discount, trackingLink }
app.post('/send/delay', async (req, res) => {
  const { phone, name, orderNumber, originalDate, newDate, delayReason, trackingNumber, carrier, apologyCode, discount, trackingLink = 'https://cookie-bite.com/track' } = req.body;
  const msg =
`⚠️ *تحديث بخصوص طلبك #${orderNumber}*

مرحباً ${name}، نعتذر بشدة عن التأخير.

📅 *الموعد الأصلي:* ${originalDate}
📅 *الموعد الجديد:* ${newDate}
📌 *السبب:* ${delayReason}

🏢 *شركة الشحن:* ${carrier}
🔢 *رقم التتبع:* ${trackingNumber}

تتبع طلبك:
${trackingLink}

🎁 اعتذاراً منا، استخدم كود *${apologyCode}* للحصول على *${discount}% خصم* على طلبك القادم.

_نشكرك على صبرك وتفهمك!_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 7. INVOICE / RECEIPT ─────────────────────────────────────
// POST /send/invoice
// Body: { phone, customerName, invoiceNumber, invoiceDate, billingAddress, vatNumber, items, subtotal, taxRate, taxAmount, grandTotal, invoiceLink, companyReg }
app.post('/send/invoice', async (req, res) => {
  const { phone, customerName, invoiceNumber, invoiceDate, billingAddress, vatNumber, items = [], subtotal, taxRate, taxAmount, grandTotal, invoiceLink = 'https://cookie-bite.com/account#orders', companyReg } = req.body;
  const itemLines = items.map(i => `• ${i.name} x${i.qty} — ${i.total}`).join('\n') || '• {{items}}';
  const msg =
`🧾 *فاتورة ضريبية #${invoiceNumber}*

مرحباً ${customerName}،

📅 *تاريخ الفاتورة:* ${invoiceDate}
🏠 *الفوترة إلى:* ${billingAddress}
🔢 *الرقم الضريبي:* ${vatNumber}

*المنتجات:*
${itemLines}

➖ المجموع الفرعي: ${subtotal}
➕ الضريبة (${taxRate}%): ${taxAmount}
━━━━━━━━━━━━━━
💰 *الإجمالي: ${grandTotal}*

تحميل الفاتورة PDF:
${invoiceLink}

_Cookie Bite · سجل تجاري: ${companyReg}_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 8. REFUND CONFIRMED ──────────────────────────────────────
// POST /send/refund
// Body: { phone, name, orderNumber, refundAmount, paymentMethod, refundDate, processingDays, orderLink }
app.post('/send/refund', async (req, res) => {
  const { phone, name, orderNumber, refundAmount, paymentMethod, refundDate, processingDays = '3-5', orderLink = 'https://cookie-bite.com/account#orders' } = req.body;
  const msg =
`✅ *تم معالجة الاسترداد*

مرحباً ${name}، تم استرداد مبلغك بنجاح.

📦 *رقم الطلب:* #${orderNumber}
💰 *المبلغ المسترد:* ${refundAmount}
💳 *إلى:* ${paymentMethod}
📅 *تاريخ الاسترداد:* ${refundDate}

⏳ يرجى السماح بـ *${processingDays} أيام عمل* حتى يظهر المبلغ في حسابك.

تفاصيل الاسترداد:
${orderLink}

_أي استفسار؟ رد على هذه الرسالة مباشرة._`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ================================================================
// ② ACCOUNT & SECURITY
// ================================================================

// ─── 9. EMAIL VERIFICATION ────────────────────────────────────
// POST /send/verify
// Body: { phone, name, code, expiryTime, verifyLink }
app.post('/send/verify', async (req, res) => {
  const { phone, name, code, expiryTime = '30 دقيقة', verifyLink = 'https://cookie-bite.com/verify' } = req.body;
  const msg =
`🔐 *تفعيل حسابك*

مرحباً ${name}، يرجى تفعيل بريدك الإلكتروني لتفعيل حسابك في Cookie Bite.

كود التحقق:

*${code}*

⏱️ ينتهي خلال ${expiryTime}.

أو اضغط هنا للتفعيل:
${verifyLink}

_لم تسجل؟ تجاهل هذه الرسالة._`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 10. LOGIN OTP (2FA) ──────────────────────────────────────
// POST /send/otp
// Body: { phone, name, otpCode, expiryMinutes, deviceInfo, loginLocation }
app.post('/send/otp', async (req, res) => {
  const { phone, name, otpCode, expiryMinutes = '10', deviceInfo, loginLocation } = req.body;
  const msg =
`🔑 *كود تسجيل الدخول*

مرحباً ${name}، استخدم هذا الكود لإتمام تسجيل الدخول:

*${otpCode}*

⏱️ صالح لمدة ${expiryMinutes} دقائق.
📱 الجهاز: ${deviceInfo}
📍 الموقع: ${loginLocation}

_لا تشارك هذا الكود مع أي شخص أبداً._`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 11. PASSWORD RESET ───────────────────────────────────────
// POST /send/password-reset
// Body: { phone, name, email, resetLink, expiryTime }
app.post('/send/password-reset', async (req, res) => {
  const { phone, name, email, resetLink, expiryTime = 'ساعة واحدة' } = req.body;
  const msg =
`🔒 *طلب إعادة تعيين كلمة المرور*

مرحباً ${name}،
تلقينا طلباً لإعادة تعيين كلمة المرور للحساب المرتبط بـ *${email}*.

اضغط هنا لتعيين كلمة مرور جديدة:
${resetLink}

⏱️ الرابط صالح لمدة ${expiryTime}.

_إذا لم تطلب ذلك، تجاهل هذه الرسالة — كلمة مرورك لن تتغير._`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 12. SECURITY ALERT ───────────────────────────────────────
// POST /send/security-alert
// Body: { phone, name, changeType, changeDate, changeTime, deviceInfo, location, ipAddress, secureLink }
app.post('/send/security-alert', async (req, res) => {
  const { phone, name, changeType, changeDate, changeTime, deviceInfo, location, ipAddress, secureLink } = req.body;
  const msg =
`🚨 *تنبيه أمني — تم تعديل حسابك*

مرحباً ${name}، اكتشفنا تغييراً في حسابك.

📝 *التعديل:* ${changeType}
📅 *التاريخ والوقت:* ${changeDate} — ${changeTime}
📱 *الجهاز:* ${deviceInfo}
🌍 *الموقع:* ${location}
🔌 *عنوان IP:* ${ipAddress}

❗ *لم تفعل ذلك؟* قم بتأمين حسابك فوراً:
${secureLink}

_فريق الأمان — Cookie Bite_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ================================================================
// ③ RETENTION & MARKETING
// ================================================================

// ─── 13. ABANDONED CART ───────────────────────────────────────
// POST /send/abandoned-cart
// Body: { phone, name, items, cartTotal, promoCode, offerExpiry, cartLink }
app.post('/send/abandoned-cart', async (req, res) => {
  const { phone, name, items = [], cartTotal, promoCode = 'COMEBACK5', offerExpiry, cartLink = 'https://cookie-bite.com/cart' } = req.body;
  const itemLines = items.map(i => `• ${i.name} — ${i.price}`).join('\n') || '• {{products}}';
  const msg =
`🛒 *نسيت حاجة في العربة، ${name}!*

عندك منتجات تنتظرك:
${itemLines}

💰 *إجمالي العربة:* ${cartTotal}

🎁 هدية إضافية! استخدم كود *${promoCode}* لخصم إضافي *5%*
⏳ العرض ينتهي: ${offerExpiry}

أكمل طلبك الآن:
${cartLink}

_المخزون محدود — لا تفوّت الفرصة!_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 14. WIN-BACK ─────────────────────────────────────────────
// POST /send/winback
// Body: { phone, name, daysInactive, discount, promoCode, expiryDate, storeLink }
app.post('/send/winback', async (req, res) => {
  const { phone, name, daysInactive, discount, promoCode, expiryDate, storeLink = 'https://cookie-bite.com/shop' } = req.body;
  const msg =
`💔 *اشتقنا إليك، ${name}!*

مرحباً! مضى *${daysInactive} يوماً* منذ آخر طلب لك. لدينا وصولات جديدة وعروض أفضل تنتظرك.

هدية خاصة لإعادة ترحيبك:

🎁 *${discount}% خصم* على طلبك القادم
🏷️ الكود: *${promoCode}*
📅 صالح حتى: ${expiryDate}

اكتشف الجديد:
${storeLink}

_إذا كنت تفضل عدم تلقي رسائلنا، رد بـ STOP_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 15. BIRTHDAY OFFER ───────────────────────────────────────
// POST /send/birthday
// Body: { phone, name, discount, birthdayCode, validFrom, validTo, storeLink }
app.post('/send/birthday', async (req, res) => {
  const { phone, name, discount, birthdayCode, validFrom, validTo, storeLink = 'https://cookie-bite.com/shop' } = req.body;
  const msg =
`🎂 *عيد ميلاد سعيد، ${name}!*

من فريق Cookie Bite بأكمله — نتمنى لك يوماً رائعاً مليئاً بالسعادة! 🥳

هدية عيد ميلادك:

🎁 *${discount}% خصم على كل شيء*
🏷️ الكود: *${birthdayCode}*
📅 من ${validFrom} حتى ${validTo}

استرد هديتك الآن:
${storeLink}

_بدون حد أدنى للطلب. استخدام واحد فقط._`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 16. BACK IN STOCK ────────────────────────────────────────
// POST /send/back-in-stock
// Body: { phone, name, productName, productPrice, productLink }
app.post('/send/back-in-stock', async (req, res) => {
  const { phone, name, productName, productPrice, productLink } = req.body;
  const msg =
`🔔 *عاد إلى المخزون!*

مرحباً ${name}!
البشرى التي انتظرتها — *${productName}* متاح مجدداً!

🛍️ *المنتج:* ${productName}
💰 *السعر:* ${productPrice}
⚡ *الكمية محدودة — اطلب الآن!*

اطلب قبل نفاد المخزون:
${productLink}

_اشتركت في تنبيهات إعادة التوفر. للإلغاء رد بـ STOP_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 17. LOYALTY REWARDS ─────────────────────────────────────
// POST /send/loyalty
// Body: { phone, name, tierName, earnedPoints, totalPoints, pointsToNext, tier1, tier2, tier3, rewardsLink }
app.post('/send/loyalty', async (req, res) => {
  const { phone, name, tierName, earnedPoints, totalPoints, pointsToNext, tier1 = 'برونزي', tier2 = 'فضي', tier3 = 'ذهبي', rewardsLink = '{{rewards_link}}' } = req.body;
  const msg =
`⭐ *رصيد النقاط الجديد!*

مرحباً ${name}، رصيدك زاد!

🏆 *مستواك:* ${tierName}
💎 *النقاط المكتسبة:* +${earnedPoints}
💰 *الرصيد الكلي:* ${totalPoints} نقطة
🎯 *حتى المستوى التالي:* ${pointsToNext} نقطة

*المستويات:*
🥉 ${tier1} — مزايا أساسية
🥈 ${tier2} — شحن مجاني
🥇 ${tier3} — عروض حصرية وأولوية الدعم

استبدل نقاطك:
${rewardsLink}`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 18. REVIEW REQUEST ───────────────────────────────────────
// POST /send/review
// Body: { phone, name, productName, orderNumber, reviewLink }
app.post('/send/review', async (req, res) => {
  const { phone, name, productName, orderNumber, reviewLink } = req.body;
  const msg =
`⭐ *كيف كانت تجربتك، ${name}؟*

نأمل أنك سعيد بمشترياتك من *Cookie Bite*!

تقييمك يساعد آلاف المتسوقين في اتخاذ قراراتهم.

📦 *المنتج:* ${productName}
🛒 *الطلب:* #${orderNumber}

اترك تقييمك هنا (30 ثانية فقط!):
${reviewLink}

★ ★ ★ ★ ★

_شكراً — رأيك يعني لنا الكثير!_ 🙏`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 19. PROMOTIONAL / FLASH SALE ────────────────────────────
// POST /send/promo
// Body: { phone, name, offerName, discount, promoCode, expiryDate, storeLink }
app.post('/send/promo', async (req, res) => {
  const { phone, name, offerName, discount, promoCode, expiryDate, storeLink = 'https://cookie-bite.com/shop' } = req.body;
  const msg =
`🔥 *عرض حصري لك، ${name}!*

*${offerName}* — لوقت محدود فقط!

💥 *${discount}% خصم* على كل المتجر
🏷️ الكود: *${promoCode}*
📅 ينتهي: ${expiryDate}

تسوق الآن:
${storeLink}

_تطبق الشروط. عرض محدود الوقت._`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 20. NEW ARRIVAL ──────────────────────────────────────────
// POST /send/new-arrival
// Body: { phone, name, collectionName, items, storeLink }
app.post('/send/new-arrival', async (req, res) => {
  const { phone, name, collectionName, items = [], storeLink = 'https://cookie-bite.com/shop' } = req.body;
  const itemLines = items.map(i => `• ${i.name} — ${i.price}`).join('\n') || '• {{new_products}}';
  const msg =
`🆕 *وصل الجديد!*

مرحباً ${name}!
وصلت *${collectionName}* للتو إلى Cookie Bite.

*أبرز الوصولات:*
${itemLines}

اكتشف الكولكشن كاملاً:
${storeLink}

_كميات محدودة — الأول ياخد الأحسن! 🛍️_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 21. PAYMENT FAILED ───────────────────────────────────────
// POST /send/payment-failed
// Body: { phone, name, orderNumber, amount, failReason, retryLink }
app.post('/send/payment-failed', async (req, res) => {
  const { phone, name, orderNumber, amount, failReason, retryLink } = req.body;
  const msg =
`⚠️ *مشكلة في الدفع*

مرحباً ${name}، للأسف لم تتم عملية الدفع لطلبك.

📦 *رقم الطلب:* #${orderNumber}
💰 *المبلغ:* ${amount}
❌ *السبب:* ${failReason}

طلبك محفوظ — أعد المحاولة هنا:
${retryLink}

_تحتاج مساعدة؟ رد على هذه الرسالة._`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 22. WISHLIST ON SALE ─────────────────────────────────────
// POST /send/wishlist-sale
// Body: { phone, name, items, storeLink }
app.post('/send/wishlist-sale', async (req, res) => {
  const { phone, name, items = [], storeLink = 'https://cookie-bite.com/shop' } = req.body;
  const itemLines = items.map(i => `• ${i.name} — ~~${i.oldPrice}~~ *${i.newPrice}*`).join('\n') || '• {{wishlist_items}}';
  const msg =
`💸 *منتجات في قائمة أمنياتك نزل سعرها!*

مرحباً ${name}!
البشرى — بعض المنتجات في قائمة أمنياتك أصبحت أرخص:

${itemLines}

لا تفوّت الفرصة، اطلب الآن:
${storeLink}

_العروض لوقت محدود!_ ⚡`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 23. REFERRAL PROGRAM ─────────────────────────────────────
// POST /send/referral
// Body: { phone, name, referralCode, referralLink, rewardAmount }
app.post('/send/referral', async (req, res) => {
  const { phone, name, referralCode, referralLink, rewardAmount } = req.body;
  const msg =
`🤝 *شارك واكسب!*

مرحباً ${name}!
ادعُ أصدقاءك إلى Cookie Bite واكسبوا معاً.

*كيف يعمل البرنامج:*
1️⃣ شارك رابط الإحالة الخاص بك
2️⃣ يطلب صديقك أول طلب
3️⃣ تحصل أنت وصديقك على *${rewardAmount}* كل منكما!

🔗 رابطك الخاص:
${referralLink}
🏷️ كودك: *${referralCode}*

_لا يوجد حد للإحالات — كلما شاركت، كلما ربحت!_ 🎉`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 24. LOYALTY TIER UPGRADE ────────────────────────────────
// POST /send/tier-upgrade
// Body: { phone, name, oldTier, newTier, newBenefits, rewardsLink }
app.post('/send/tier-upgrade', async (req, res) => {
  const { phone, name, oldTier, newTier, newBenefits = [], rewardsLink = '{{rewards_link}}' } = req.body;
  const benefitLines = newBenefits.map(b => `✅ ${b}`).join('\n') || '✅ {{benefits}}';
  const msg =
`🏆 *ترقية مستوى العضوية!*

تهانينا ${name}! 🎉
ترقيت من مستوى *${oldTier}* إلى مستوى *${newTier}*!

*مزاياك الجديدة:*
${benefitLines}

استكشف مزاياك:
${rewardsLink}

_شكراً لولائك لـ Cookie Bite! 💎_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 25. GIFT CARD ────────────────────────────────────────────
// POST /send/gift-card
// Body: { phone, senderName, recipientName, amount, giftCode, expiryDate, storeLink, personalMessage }
app.post('/send/gift-card', async (req, res) => {
  const { phone, senderName, recipientName, amount, giftCode, expiryDate, storeLink = 'https://cookie-bite.com/shop', personalMessage } = req.body;
  const msg =
`🎁 *لديك بطاقة هدية!*

مرحباً ${recipientName}!
أهداك *${senderName}* بطاقة هدية من Cookie Bite.

💰 *قيمة البطاقة:* ${amount}
🏷️ *الكود:* *${giftCode}*
📅 *صالحة حتى:* ${expiryDate}

${personalMessage ? `💌 رسالة شخصية: "${personalMessage}"\n\n` : ''}ابدأ التسوق:
${storeLink}

_استخدم الكود عند الدفع لخصم القيمة كاملاً._`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 26. PRE-ORDER CONFIRMED ─────────────────────────────────
// POST /send/preorder
// Body: { phone, name, productName, orderNumber, estimatedDate, total }
app.post('/send/preorder', async (req, res) => {
  const { phone, name, productName, orderNumber, estimatedDate, total } = req.body;
  const msg =
`📌 *تأكيد الطلب المسبق!*

مرحباً ${name}، تم تسجيل طلبك المسبق بنجاح.

🛍️ *المنتج:* ${productName}
📦 *رقم الطلب:* #${orderNumber}
💰 *الإجمالي:* ${total}
📅 *موعد الإتاحة المتوقع:* ${estimatedDate}

سنخبرك فور توفر المنتج وشحن طلبك. 🔔

_شكراً لثقتك بنا!_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 27. SUPPORT TICKET OPENED ───────────────────────────────
// POST /send/support-opened
// Body: { phone, name, ticketNumber, subject, estimatedResponse }
app.post('/send/support-opened', async (req, res) => {
  const { phone, name, ticketNumber, subject, estimatedResponse = '24 ساعة' } = req.body;
  const msg =
`🎫 *تم استلام طلب دعمك*

مرحباً ${name}،
تلقينا طلب دعمك وسيُعالَج في أقرب وقت ممكن.

🔢 *رقم التذكرة:* #${ticketNumber}
📝 *الموضوع:* ${subject}
⏱️ *وقت الرد المتوقع:* خلال ${estimatedResponse}

سيتواصل معك فريق الدعم قريباً.

_Cookie Bite — نحن هنا لمساعدتك!_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 28. SUPPORT TICKET RESOLVED ─────────────────────────────
// POST /send/support-resolved
// Body: { phone, name, ticketNumber, subject, resolution, surveyLink }
app.post('/send/support-resolved', async (req, res) => {
  const { phone, name, ticketNumber, subject, resolution, surveyLink = '{{survey_link}}' } = req.body;
  const msg =
`✅ *تم حل مشكلتك!*

مرحباً ${name}،
يسعدنا إخبارك بأنه تم حل مشكلتك.

🔢 *رقم التذكرة:* #${ticketNumber}
📝 *الموضوع:* ${subject}
💡 *الحل:* ${resolution}

هل أنت راضٍ عن خدمتنا؟
${surveyLink}

_إذا استمرت المشكلة، رد على هذه الرسالة مباشرة._`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 29. ADDRESS CONFIRMATION ────────────────────────────────
// POST /send/address-confirm
// Body: { phone, name, orderNumber, address, confirmLink, changeLink }
app.post('/send/address-confirm', async (req, res) => {
  const { phone, name, orderNumber, address, confirmLink, changeLink } = req.body;
  const msg =
`📍 *تأكيد عنوان الشحن*

مرحباً ${name}،
قبل شحن طلبك *#${orderNumber}*، يرجى تأكيد عنوان التسليم:

🏠 *العنوان:* ${address}

✅ تأكيد العنوان:
${confirmLink}

✏️ تعديل العنوان:
${changeLink}

_يرجى التأكيد خلال 12 ساعة حتى لا يتأخر شحن طلبك._`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 30. PAYMENT REMINDER (BNPL) ─────────────────────────────
// POST /send/payment-reminder
// Body: { phone, name, orderNumber, amount, dueDate, payLink }
app.post('/send/payment-reminder', async (req, res) => {
  const { phone, name, orderNumber, amount, dueDate, payLink } = req.body;
  const msg =
`📅 *تذكير بموعد الدفع*

مرحباً ${name}،
تذكير ودي بأن موعد قسط طلبك يقترب.

📦 *رقم الطلب:* #${orderNumber}
💰 *المبلغ المستحق:* ${amount}
📅 *تاريخ الاستحقاق:* ${dueDate}

ادفع الآن لتجنب أي رسوم تأخير:
${payLink}

_شكراً لالتزامك!_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ================================================================
// ④ INTERNAL REPORTS (للفريق الداخلي)
// ================================================================

// ─── 31. WEEKLY SALES REPORT ─────────────────────────────────
// POST /send/report/weekly-sales
// Body: { phone, managerName, weekRange, revenue, revGrowth, orders, ordGrowth, newCustomers, convRate, topProducts, reportLink }
app.post('/send/report/weekly-sales', async (req, res) => {
  const { phone, managerName, weekRange, revenue, revGrowth, orders, ordGrowth, newCustomers, convRate, topProducts = [], reportLink = '{{report_link}}', sendDay = 'الأحد' } = req.body;
  const productLines = topProducts.slice(0,3).map((p,i) => `${i+1}. ${p.name} — ${p.revenue}`).join('\n') || '1. {{product}}';
  const msg =
`📊 *تقرير المبيعات الأسبوعي — ${weekRange}*

مرحباً ${managerName}، ملخص أداء هذا الأسبوع:

💰 *الإيرادات:* ${revenue} (+${revGrowth}%)
📦 *الطلبات:* ${orders} (+${ordGrowth}%)
👤 *عملاء جدد:* ${newCustomers}
📈 *معدل التحويل:* ${convRate}%

*أفضل المنتجات:*
${productLines}

التقرير الكامل:
${reportLink}

_يُرسل تلقائياً كل ${sendDay}._`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 32. LOW STOCK ALERT ─────────────────────────────────────
// POST /send/report/low-stock
// Body: { phone, managerName, criticalItems, lowItems, inventoryLink }
app.post('/send/report/low-stock', async (req, res) => {
  const { phone, managerName, criticalItems = [], lowItems = [], inventoryLink = '{{inventory_link}}' } = req.body;
  const critLines = criticalItems.map(i => `• ${i.name} (${i.sku}) — ${i.stock} قطعة — ${i.days} أيام`).join('\n') || '• {{critical_items}}';
  const lowLines = lowItems.map(i => `• ${i.name} (${i.sku}) — ${i.stock} قطعة`).join('\n') || '• {{low_items}}';
  const msg =
`🚨 *تنبيه مخزون منخفض — إجراء مطلوب*

مرحباً ${managerName}، المنتجات التالية تحتاج إعادة طلب فوري:

⛔ *حرج جداً:*
${critLines}

⚠️ *منخفض:*
${lowLines}

افتح لوحة المخزون:
${inventoryLink}

_مراقبة مخزون تلقائية — Cookie Bite_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 33. P&L SUMMARY ─────────────────────────────────────────
// POST /send/report/pnl
// Body: { phone, managerName, period, grossRevenue, discounts, totalCogs, totalOpex, netProfit, margin, targetMargin, revGrowth, profitGrowth, reportLink }
app.post('/send/report/pnl', async (req, res) => {
  const { phone, managerName, period, grossRevenue, discounts, totalCogs, totalOpex, netProfit, margin, targetMargin, revGrowth, profitGrowth, reportLink = '{{report_link}}' } = req.body;
  const msg =
`💹 *ملخص الأرباح والخسائر — ${period}*

مرحباً ${managerName}،

💰 *إجمالي الإيرادات:* ${grossRevenue}
🏷️ *الخصومات:* -${discounts}
📦 *تكلفة البضاعة (COGS):* -${totalCogs}
📣 *مصاريف التشغيل:* -${totalOpex}
━━━━━━━━━━━━━━
✅ *صافي الربح:* ${netProfit}
📈 *هامش الربح:* ${margin}% (الهدف: ${targetMargin}%)

*مقارنة بالفترة السابقة:*
الإيرادات: +${revGrowth}% | الربح: +${profitGrowth}%

التقرير الكامل:
${reportLink}

_سري · Cookie Bite · ${period}_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 34. MARKETING REPORT ────────────────────────────────────
// POST /send/report/marketing
// Body: { phone, managerName, period, totalSpend, attributedRevenue, roas, targetRoas, channels, openRate, clickRate, reportLink }
app.post('/send/report/marketing', async (req, res) => {
  const { phone, managerName, period, totalSpend, attributedRevenue, roas, targetRoas, channels = [], openRate, clickRate, reportLink = '{{report_link}}' } = req.body;
  const channelLines = channels.map(c => `${c.icon || '🔵'} ${c.name}: ${c.revenue} (ROAS ${c.roas}x)`).join('\n') || '🔵 {{channels}}';
  const msg =
`📣 *تقرير الأداء التسويقي — ${period}*

مرحباً ${managerName}،

💸 *الإنفاق الكلي:* ${totalSpend}
💰 *الإيرادات المنسوبة:* ${attributedRevenue}
📈 *ROAS المدمج:* ${roas}x (الهدف: ${targetRoas}x)

*حسب القناة:*
${channelLines}

*مقاييس البريد الإلكتروني:*
📬 معدل الفتح: ${openRate}%
🖱️ معدل النقر: ${clickRate}%

التقرير الكامل:
${reportLink}`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 35. RETURNS REPORT ──────────────────────────────────────
// POST /send/report/returns
// Body: { phone, managerName, period, totalReturns, returnRate, totalRefunds, avgDays, reasons, highReturnCats, reportLink }
app.post('/send/report/returns', async (req, res) => {
  const { phone, managerName, period, totalReturns, returnRate, totalRefunds, avgDays, reasons = [], highReturnCats = [], reportLink = '{{report_link}}' } = req.body;
  const reasonLines = reasons.slice(0,4).map((r,i) => `${i+1}. ${r.reason} — ${r.pct}%`).join('\n') || '1. {{reason}}';
  const catLines = highReturnCats.map(c => `⚠️ ${c.name} — ${c.rate}% معدل إرجاع`).join('\n') || '⚠️ {{categories}}';
  const msg =
`↩️ *تقرير المرتجعات والاسترداد — ${period}*

مرحباً ${managerName}،

📦 *إجمالي المرتجعات:* ${totalReturns} (${returnRate}% معدل)
💸 *قيمة الاسترداد:* ${totalRefunds}
⏱️ *متوسط وقت المعالجة:* ${avgDays} أيام

*أسباب الإرجاع:*
${reasonLines}

*فئات ذات معدل إرجاع مرتفع:*
${catLines}

التقرير الكامل:
${reportLink}

_Cookie Bite · ${period}_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 36. CAMPAIGN REPORT ─────────────────────────────────────
// POST /send/report/campaign
// Body: { phone, managerName, period, totalReach, attributedRev, totalSpend, roas, campaigns, reportLink, sendDay }
app.post('/send/report/campaign', async (req, res) => {
  const { phone, managerName, period, totalReach, attributedRev, totalSpend, roas, campaigns = [], reportLink = '{{report_link}}', sendDay = 'الأحد' } = req.body;
  const campLines = campaigns.map((c,i) => `${i+1}. ${c.name} — ROAS ${c.roas}x`).join('\n') || '1. {{campaign}}';
  const msg =
`🎯 *تقرير أداء الحملات — ${period}*

مرحباً ${managerName}،

📊 *إجمالي الوصول:* ${totalReach}
💰 *الإيرادات المنسوبة:* ${attributedRev}
💸 *الإنفاق الكلي:* ${totalSpend}
📈 *ROAS المدمج:* ${roas}x

*تفاصيل الحملات:*
${campLines}

التقرير الكامل:
${reportLink}

_يُرسل تلقائياً كل ${sendDay} · Cookie Bite_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 37. SUPPLIER REORDER ────────────────────────────────────
// POST /send/report/supplier-reorder
// Body: { phone, opsManager, urgentItems, soonItems, totalCost, poLink, sendFrequency }
app.post('/send/report/supplier-reorder', async (req, res) => {
  const { phone, opsManager, urgentItems = [], soonItems = [], totalCost, poLink = '{{po_link}}', sendFrequency = 'يومياً' } = req.body;
  const urgentLines = urgentItems.map(i => `• ${i.name} (${i.sku}) — ${i.stock} متبقي → اطلب ${i.qty} من ${i.supplier}`).join('\n') || '• {{urgent_items}}';
  const soonLines = soonItems.map(i => `• ${i.name} (${i.sku}) — ${i.stock} متبقي`).join('\n') || '• {{soon_items}}';
  const msg =
`📦 *مطلوب إعادة طلب من المورد*

مرحباً ${opsManager}، المنتجات التالية تحتاج إعادة طلب الآن:

⛔ *عاجل:*
${urgentLines}

⚠️ *قريباً:*
${soonLines}

💰 *التكلفة التقديرية الكلية:* ${totalCost}

فتح أوامر الشراء:
${poLink}

_تقرير تلقائي · ${sendFrequency} · Cookie Bite_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 38. ORDER STATUS REPORT (للعميل) ────────────────────────
// POST /send/report/order-status
// Body: { phone, customerName, orders, totalOrders, totalSpent, memberSince, ordersLink }
app.post('/send/report/order-status', async (req, res) => {
  const { phone, customerName, orders = [], totalOrders, totalSpent, memberSince, ordersLink = '{{orders_link}}' } = req.body;
  const statusEmoji = { delivered: '✅', transit: '🚚', processing: '🕐', cancelled: '❌', refunded: '↩️' };
  const orderLines = orders.map(o => `${statusEmoji[o.status] || '📦'} *#${o.number}* — ${o.date} — ${o.total} — ${o.statusLabel}`).join('\n') || '📦 {{orders}}';
  const msg =
`📋 *سجل طلباتك — Cookie Bite*

مرحباً ${customerName}، ملخص طلباتك الأخيرة:

${orderLines}

━━━━━━━━━━━━━━
📦 *إجمالي الطلبات:* ${totalOrders}
💰 *إجمالي الإنفاق:* ${totalSpent}
🗓️ *عضو منذ:* ${memberSince}

عرض كل الطلبات:
${ordersLink}`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 39. DAILY DASHBOARD SUMMARY ─────────────────────────────
// POST /send/report/daily-summary
// Body: { phone, managerName, date, revenue, orders, newCustomers, pendingOrders, lowStockCount, reportLink }
app.post('/send/report/daily-summary', async (req, res) => {
  const { phone, managerName, date, revenue, orders, newCustomers, pendingOrders, lowStockCount, reportLink = '{{report_link}}' } = req.body;
  const msg =
`📊 *ملخص اليوم — ${date}*

صباح الخير ${managerName}! ملخص أداء الأمس:

💰 الإيرادات: *${revenue}*
📦 الطلبات: *${orders}*
👤 عملاء جدد: *${newCustomers}*
🕐 طلبات معلقة: *${pendingOrders}*
⚠️ منتجات مخزون منخفض: *${lowStockCount}*

لوحة التحكم الكاملة:
${reportLink}

_Cookie Bite — تقرير يومي تلقائي_`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ─── 40. CUSTOMER SURVEY / FEEDBACK ──────────────────────────
// POST /send/survey
// Body: { phone, name, surveyLink, incentive }
app.post('/send/survey', async (req, res) => {
  const { phone, name, surveyLink, incentive } = req.body;
  const msg =
`📝 *نحتاج رأيك، ${name}!*

تجربتك مهمة جداً لنا في Cookie Bite.

لدينا استبيان قصير يستغرق دقيقتين فقط — رأيك يساعدنا نقدم لك خدمة أفضل.

${incentive ? `🎁 *مكافأة:* ${incentive} عند إكمال الاستبيان\n\n` : ''}شاركنا رأيك:
${surveyLink}

_شكراً لوقتك الثمين!_ 🙏`;
  const ok = await sendWA(phone, msg);
  res.json({ success: ok });
});


// ================================================================
// START SERVER
// ================================================================
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  ✅ WhatsApp Bridge running on port ${PORT}  ');
  console.log('  📱 Scan QR Code to connect WhatsApp      ');
  console.log('  🌐 http://localhost:${PORT}/status           ');
  console.log('═══════════════════════════════════════════');
  console.log('');
});

