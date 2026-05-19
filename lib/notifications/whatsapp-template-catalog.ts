export type WhatsAppTemplateDef = {
  /** DB key: channel=whatsapp */
  key: string;
  /** Bridge route suffix, e.g. order-confirm → POST /send/order-confirm */
  bridgeRoute: string;
  labelEn: string;
  labelAr: string;
  variables: string[];
  defaultBodyAr: string;
  defaultBodyEn: string;
};

export const WHATSAPP_TEMPLATE_CATALOG: WhatsAppTemplateDef[] = [
  {
    key: "welcome",
    bridgeRoute: "welcome",
    labelEn: "Welcome",
    labelAr: "ترحيب",
    variables: ["name", "promoCode"],
    defaultBodyAr: `👋 *مرحباً بك في Cookie Bite، {{name}}!*

يسعدنا انضمامك لعائلتنا.

🎁 كود ترحيبي: *{{promoCode}}* — خصم 10% على أول طلب
🛒 https://cookie-bite.com/shop`,
    defaultBodyEn: `👋 *Welcome to Cookie Bite, {{name}}!*

Use code *{{promoCode}}* for 10% off your first order.
🛒 https://cookie-bite.com/shop`,
  },
  {
    key: "order_confirm",
    bridgeRoute: "order-confirm",
    labelEn: "Order confirmed",
    labelAr: "تأكيد الطلب",
    variables: [
      "name",
      "orderNumber",
      "orderDate",
      "paymentMethod",
      "items",
      "total",
      "address",
    ],
    defaultBodyAr: `✅ *تأكيد الطلب!*

مرحباً {{name}}، شكراً على طلبك.

📦 *رقم الطلب:* #{{orderNumber}}
🗓️ *التاريخ:* {{orderDate}}
💳 *الدفع:* {{paymentMethod}}

*المنتجات:*
{{items}}

💰 *الإجمالي:* {{total}}
📍 *الشحن:* {{address}}

https://cookie-bite.com/track`,
    defaultBodyEn: `✅ *Order confirmed*

Hi {{name}}, order #{{orderNumber}} on {{orderDate}}.
{{items}}
Total: {{total}}`,
  },
  {
    key: "shipped",
    bridgeRoute: "shipped",
    labelEn: "Shipped",
    labelAr: "تم الشحن",
    variables: [
      "name",
      "orderNumber",
      "carrier",
      "trackingNumber",
      "estimatedDelivery",
      "trackingLink",
    ],
    defaultBodyAr: `🚚 *طلبك في الطريق!*

مرحباً {{name}}!

📦 #{{orderNumber}}
🏢 {{carrier}} — {{trackingNumber}}
📅 {{estimatedDelivery}}

{{trackingLink}}`,
    defaultBodyEn: `🚚 *Shipped*

Hi {{name}}, order #{{orderNumber}} is on the way.
Track: {{trackingLink}}`,
  },
  {
    key: "delivered",
    bridgeRoute: "delivered",
    labelEn: "Delivered",
    labelAr: "تم التسليم",
    variables: ["name", "orderNumber", "deliveryDate", "address", "returnWindow", "supportLink"],
    defaultBodyAr: `🎉 *طلبك وصل!*

مرحباً {{name}}، تم تسليم #{{orderNumber}} بتاريخ {{deliveryDate}}.
📍 {{address}}

الإرجاع خلال {{returnWindow}} يوماً.
{{supportLink}}`,
    defaultBodyEn: `🎉 *Delivered*

Hi {{name}}, order #{{orderNumber}} was delivered on {{deliveryDate}}.`,
  },
  {
    key: "cancelled",
    bridgeRoute: "cancelled",
    labelEn: "Cancelled",
    labelAr: "إلغاء الطلب",
    variables: [
      "name",
      "orderNumber",
      "orderDate",
      "orderTotal",
      "refundAmount",
      "paymentMethod",
      "processingDays",
      "cancelReason",
      "storeLink",
    ],
    defaultBodyAr: `❌ *تم إلغاء الطلب*

مرحباً {{name}}، طلب #{{orderNumber}}.

💰 مسترد: {{refundAmount}} خلال {{processingDays}} أيام
السبب: {{cancelReason}}

{{storeLink}}`,
    defaultBodyEn: `❌ *Order cancelled*

Hi {{name}}, order #{{orderNumber}} was cancelled. Refund: {{refundAmount}}.`,
  },
  {
    key: "delay",
    bridgeRoute: "delay",
    labelEn: "Shipping delay",
    labelAr: "تأخير الشحن",
    variables: [
      "name",
      "orderNumber",
      "originalDate",
      "newDate",
      "delayReason",
      "trackingNumber",
      "carrier",
      "apologyCode",
      "discount",
      "trackingLink",
    ],
    defaultBodyAr: `⚠️ *تأخير في الطلب #{{orderNumber}}*

مرحباً {{name}}، نعتذر عن التأخير.

من {{originalDate}} إلى {{newDate}}
{{delayReason}}

🎁 كود {{apologyCode}} — خصم {{discount}}%`,
    defaultBodyEn: `⚠️ *Delay on order #{{orderNumber}}*

Hi {{name}}, new ETA: {{newDate}}. Sorry for the delay.`,
  },
  {
    key: "invoice",
    bridgeRoute: "invoice",
    labelEn: "Invoice / receipt",
    labelAr: "فاتورة",
    variables: [
      "customerName",
      "invoiceNumber",
      "invoiceDate",
      "items",
      "grandTotal",
      "invoiceLink",
    ],
    defaultBodyAr: `🧾 *فاتورة Cookie Bite*

{{customerName}} — #{{invoiceNumber}}
{{invoiceDate}}

{{items}}

💰 *الإجمالي:* {{grandTotal}}

{{invoiceLink}}`,
    defaultBodyEn: `🧾 *Invoice #{{invoiceNumber}}*

{{customerName}} — total {{grandTotal}}
{{invoiceLink}}`,
  },
  {
    key: "payment_failed",
    bridgeRoute: "payment-failed",
    labelEn: "Payment failed",
    labelAr: "فشل الدفع",
    variables: ["name", "orderNumber", "amount", "retryLink"],
    defaultBodyAr: `⚠️ *فشل الدفع*

مرحباً {{name}}، لم نتمكن من إتمام دفع الطلب #{{orderNumber}} ({{amount}}).

أعد المحاولة: {{retryLink}}`,
    defaultBodyEn: `⚠️ *Payment failed*

Hi {{name}}, payment for order #{{orderNumber}} failed. Retry: {{retryLink}}`,
  },
  {
    key: "otp",
    bridgeRoute: "otp",
    labelEn: "OTP code",
    labelAr: "رمز تحقق",
    variables: ["code", "expiryMinutes"],
    defaultBodyAr: `🔐 *رمز التحقق:* {{code}}

صالح لمدة {{expiryMinutes}} دقائق. لا تشاركه مع أحد.`,
    defaultBodyEn: `🔐 *Verification code:* {{code}}

Valid for {{expiryMinutes}} minutes. Do not share.`,
  },
  {
    key: "abandoned_cart",
    bridgeRoute: "abandoned-cart",
    labelEn: "Abandoned cart",
    labelAr: "سلة متروكة",
    variables: ["name", "cartLink", "discountCode"],
    defaultBodyAr: `🛒 *نسيت شيئاً في سلتك؟*

مرحباً {{name}}! أكمل طلبك:
{{cartLink}}

🎁 {{discountCode}}`,
    defaultBodyEn: `🛒 *Your cart is waiting*

Hi {{name}}: {{cartLink}}`,
  },
];

export function getWhatsAppCatalogEntry(key: string): WhatsAppTemplateDef | undefined {
  return WHATSAPP_TEMPLATE_CATALOG.find((t) => t.key === key);
}

export function bridgeRouteForTemplateKey(key: string): string | undefined {
  return getWhatsAppCatalogEntry(key)?.bridgeRoute;
}
