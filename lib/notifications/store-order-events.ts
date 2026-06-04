import { storeOrderEventAlert } from "@/lib/email/templates";
import { isEmailConfigured } from "@/lib/email/resend";
import { sendInternalEmail } from "@/lib/email/send";
import {
  appBaseUrl,
  loadOrderNotificationContext,
  orderDisplayNumber,
} from "@/lib/notifications/order-context";
import { listOwnerAndAdminEmails } from "@/lib/notifications/staff-recipients";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type StoreOrderEventType =
  | "created"
  | "paid"
  | "payment_failed"
  | "status_pending"
  | "status_processing"
  | "status_shipped"
  | "status_delivered"
  | "status_cancelled"
  | "status_refunded"
  | "deleted";

const EVENT_LABEL: Record<StoreOrderEventType, string> = {
  created: "New order",
  paid: "Payment received",
  payment_failed: "Payment failed",
  status_pending: "Order pending",
  status_processing: "Order processing",
  status_shipped: "Order shipped",
  status_delivered: "Order delivered",
  status_cancelled: "Order cancelled",
  status_refunded: "Order refunded",
  deleted: "Order deleted",
};

function paymentMethodLabel(method: string): string {
  const m = method.toLowerCase();
  if (m === "cod") return "Cash on delivery";
  if (m === "card" || m === "paymob") return "Card (Paymob)";
  return method || "—";
}

async function shouldSkipCreatedAlert(orderId: string): Promise<boolean> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return true;
  const { data } = await supabase
    .from("orders")
    .select("staff_alert_sent_at")
    .eq("id", orderId)
    .maybeSingle();
  return Boolean(data?.staff_alert_sent_at);
}

async function markCreatedAlertSent(orderId: string): Promise<void> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return;
  await supabase
    .from("orders")
    .update({ staff_alert_sent_at: new Date().toISOString() })
    .eq("id", orderId);
}

/**
 * يرسل بريداً داخلياً إلى cookie-bite@cookie-bite.com (ومالك/أدمن) عند أي حدث طلب.
 */
export async function notifyStoreOrderEvent(opts: {
  orderId: string;
  event: StoreOrderEventType;
  note?: string;
  actorEmail?: string | null;
}): Promise<{ sent: number }> {
  if (!isEmailConfigured()) return { sent: 0 };

  if (opts.event === "created" && (await shouldSkipCreatedAlert(opts.orderId))) {
    return { sent: 0 };
  }

  const ctx = await loadOrderNotificationContext(opts.orderId);
  if (!ctx && opts.event !== "deleted") {
    return { sent: 0 };
  }

  const recipients = await listOwnerAndAdminEmails();
  if (recipients.length === 0) return { sent: 0 };

  const orderNum = ctx ? orderDisplayNumber(ctx) : opts.orderId.slice(0, 8);
  const adminUrl = `${appBaseUrl()}/admin/orders`;
  const eventLabel = EVENT_LABEL[opts.event];

  let invoiceRef: string | null = null;
  if (ctx) {
    const supabase = tryCreateSupabaseAdminClient();
    if (supabase) {
      const { data: inv } = await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("order_id", opts.orderId)
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (inv?.invoice_number) invoiceRef = String(inv.invoice_number);
    }
  }

  const tpl = storeOrderEventAlert({
    eventLabel,
    orderNumber: orderNum,
    customerName: ctx?.customerName ?? "—",
    customerEmail: ctx?.customerEmail ?? null,
    customerPhone: ctx?.customerPhone ?? null,
    totalEgp: ctx?.totalEgp ?? 0,
    paymentMethod: ctx ? paymentMethodLabel(ctx.paymentMethod) : "—",
    paymentStatus: ctx?.paymentStatus ?? "—",
    orderStatus: ctx?.status ?? "—",
    shippingAddress: ctx?.shippingAddressLine ?? "—",
    invoiceNumber: invoiceRef,
    note: opts.note,
    actorEmail: opts.actorEmail,
    adminUrl,
  });

  let sent = 0;
  for (const to of recipients) {
    try {
      await sendInternalEmail({ to, subject: tpl.subject, html: tpl.html });
      sent += 1;
    } catch (err) {
      console.error(`store order event ${opts.event} → ${to}`, err);
    }
  }

  if (sent > 0 && opts.event === "created") {
    await markCreatedAlertSent(opts.orderId);
  }

  return { sent };
}

/** يُستدعى بعد تحديث الحالة أو الدفع من لوحة الإدارة. */
export function storeEventFromOrderPatch(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
): StoreOrderEventType[] {
  const events: StoreOrderEventType[] = [];
  const prevStatus = String(before?.status ?? "").toLowerCase();
  const nextStatus = String(after.status ?? "").toLowerCase();
  const prevPay = String(before?.payment_status ?? "").toLowerCase();
  const nextPay = String(after.payment_status ?? "").toLowerCase();

  if (nextPay === "paid" && prevPay !== "paid") {
    events.push("paid");
  }
  if (nextPay === "failed" && prevPay !== "failed") {
    events.push("payment_failed");
  }

  if (nextStatus !== prevStatus) {
    const map: Record<string, StoreOrderEventType> = {
      pending: "status_pending",
      processing: "status_processing",
      shipped: "status_shipped",
      delivered: "status_delivered",
      cancelled: "status_cancelled",
      refunded: "status_refunded",
    };
    const ev = map[nextStatus];
    if (ev) events.push(ev);
  }

  return events;
}
