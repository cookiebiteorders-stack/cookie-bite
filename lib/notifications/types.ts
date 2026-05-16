export type NotificationType =
  | "order_confirmation"
  | "payment_confirmation"
  | "invoice"
  | "shipping_update"
  | "whatsapp"
  | "email";

export type NotificationChannel = "email" | "whatsapp" | "sms" | "push";

export type NotificationLogStatus = "queued" | "sent" | "delivered" | "failed" | "skipped";

export type OrderNotificationContext = {
  orderId: string;
  orderNumber: number;
  orderCode: string | null;
  totalEgp: number;
  subtotalEgp: number;
  deliveryFeeEgp: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddressLine: string;
  itemsHtml: string;
  lang: "en" | "ar";
};
