import { newOrderStaffAlert } from "@/lib/email/templates";
import { isEmailConfigured } from "@/lib/email/resend";
import { sendInternalEmail } from "@/lib/email/send";
import type { OrderNotificationContext } from "@/lib/notifications/types";
import { listOwnerAndAdminEmails } from "@/lib/notifications/staff-recipients";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com").replace(/\/$/, "");
}

/**
 * Notifies every owner & admin when a new order is placed (alongside customer confirmation).
 */
export async function tryNotifyStaffNewOrder(
  ctx: OrderNotificationContext,
  orderId: string,
): Promise<void> {
  if (!isEmailConfigured()) return;

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return;

  const { data: order } = await supabase
    .from("orders")
    .select("staff_alert_sent_at")
    .eq("id", orderId)
    .maybeSingle();

  if (order?.staff_alert_sent_at) return;

  const recipients = await listOwnerAndAdminEmails();
  if (recipients.length === 0) return;

  const tpl = newOrderStaffAlert({
    orderNumber: ctx.orderCode ?? `#${ctx.orderNumber}`,
    customerName: ctx.customerName,
    customerEmail: ctx.customerEmail,
    customerPhone: ctx.customerPhone,
    totalEgp: ctx.totalEgp,
    paymentMethod: ctx.paymentMethod,
    shippingAddress: ctx.shippingAddressLine,
    adminUrl: `${appBaseUrl()}/admin/orders`,
  });

  let anySent = false;
  for (const to of recipients) {
    try {
      await sendInternalEmail({ to, subject: tpl.subject, html: tpl.html });
      anySent = true;
    } catch (err) {
      console.error(`staff new order alert → ${to}`, err);
    }
  }

  if (anySent) {
    await supabase
      .from("orders")
      .update({ staff_alert_sent_at: new Date().toISOString() })
      .eq("id", orderId);
  }
}
