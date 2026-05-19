import { postWhatsAppBridge } from "@/lib/whatsapp/bridge-client";
import type { WhatsAppSendResult } from "@/lib/whatsapp/send";

type OrderConfirmBridgePayload = {
  phone: string;
  name: string;
  orderNumber: string;
  orderDate: string;
  total: string;
  items?: Array<{ name: string; qty: number; price: string }>;
  address?: string;
  paymentMethod?: string;
  trackingLink?: string;
};

type PaymentInvoiceBridgePayload = {
  phone: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  items?: Array<{ name: string; qty: number; total: string }>;
  grandTotal: string;
  invoiceLink: string;
};

/** Rich Arabic templates via whatsapp-web.js bridge (40+ routes in services/whatsapp-bridge). */
export async function sendOrderConfirmedViaBridge(
  payload: OrderConfirmBridgePayload,
): Promise<WhatsAppSendResult> {
  const result = await postWhatsAppBridge("/send/order-confirm", {
    ...payload,
    trackingLink: payload.trackingLink ?? "https://cookie-bite.com/track",
  });
  return { ...result, mode: "bridge" };
}

export async function sendPaymentInvoiceViaBridge(
  payload: PaymentInvoiceBridgePayload,
): Promise<WhatsAppSendResult> {
  const result = await postWhatsAppBridge("/send/invoice", {
    phone: payload.phone,
    customerName: payload.customerName,
    invoiceNumber: payload.invoiceNumber,
    invoiceDate: payload.invoiceDate,
    items: payload.items,
    subtotal: payload.grandTotal,
    taxRate: "0",
    taxAmount: "0 ج.م",
    grandTotal: payload.grandTotal,
    invoiceLink: payload.invoiceLink,
    companyReg: "Cookie Bite — New Cairo",
  });
  return { ...result, mode: "bridge" };
}
