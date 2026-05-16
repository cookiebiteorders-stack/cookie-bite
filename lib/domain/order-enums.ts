/** قيم موحّدة للطلب والدفع — استخدمها في Zod وAPI لتقليل التباين بين الواجهات وقاعدة البيانات. */

export const ORDER_STATUS_VALUES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export const PAYMENT_STATUS_VALUES = ["unpaid", "paid", "failed", "refunded"] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];
