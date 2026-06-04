import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOrderItems } from "@/lib/db/orders";
import type { OrderNotificationContext } from "@/lib/notifications/types";
import type { OrderRow } from "@/lib/db/types";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function formatShippingLine(addr: Record<string, unknown>): string {
  const parts = [str(addr.address), str(addr.city)].filter(Boolean);
  return parts.join(", ") || "—";
}

function buildItemsHtml(
  items: { product_name: string; quantity: number; unit_price_egp: number }[],
  deliveryFeeEgp: number,
): string {
  const rows = items.map(
    (i) =>
      `<tr><td style="padding:8px 0;border-bottom:1px solid #F2DDC5">${i.product_name} × ${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #F2DDC5;text-align:right">${(i.unit_price_egp * i.quantity).toFixed(0)} EGP</td></tr>`,
  );
  if (deliveryFeeEgp > 0) {
    rows.push(
      `<tr><td style="padding:8px 0;border-bottom:1px solid #F2DDC5">Delivery</td><td style="padding:8px 0;border-bottom:1px solid #F2DDC5;text-align:right">${deliveryFeeEgp} EGP</td></tr>`,
    );
  } else {
    rows.push(
      `<tr><td style="padding:8px 0;border-bottom:1px solid #F2DDC5">Delivery</td><td style="padding:8px 0;border-bottom:1px solid #F2DDC5;text-align:right">Free</td></tr>`,
    );
  }
  return rows.join("");
}

async function resolveRecipient(order: OrderRow): Promise<{
  email: string | null;
  name: string;
  phone: string | null;
}> {
  const ship = (order.shipping_address ?? {}) as Record<string, unknown>;
  let email = (order.guest_email ?? str(ship.email)) || null;
  let name = str(ship.name) || "Customer";
  const phone = str(ship.phone) || null;

  if (order.user_id) {
    const supabase = createSupabaseAdminClient();
    const { data: user } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", order.user_id)
      .maybeSingle();
    if (user) {
      email = user.email ?? email;
      name = user.full_name ?? name;
    }
  }
  return { email, name, phone };
}

export async function loadOrderNotificationContext(
  orderId: string,
): Promise<OrderNotificationContext | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return null;
  }
  const supabase = createSupabaseAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) {
    console.error("[notifications] order load", error?.message ?? "not found");
    return null;
  }
  const row = order as OrderRow;
  const raw = row as OrderRow & { number?: string | number | null };
  const items = await getOrderItems(orderId);
  const recipient = await resolveRecipient(row);
  const ship = (row.shipping_address ?? {}) as Record<string, unknown>;

  const lang: "en" | "ar" =
    row.language === "ar" || row.language === "en" ? row.language : "en";

  const displayNum =
    row.order_number ??
    (raw.number != null && raw.number !== "" ? Number(raw.number) : 0);

  return {
    orderId: row.id,
    orderNumber: displayNum,
    orderCode:
      row.order_code ??
      (raw.number != null && String(raw.number).trim() ? String(raw.number) : null),
    totalEgp: Number(row.total_egp),
    subtotalEgp: Number(row.subtotal_egp),
    deliveryFeeEgp: Number(row.delivery_fee_egp),
    paymentMethod: row.payment_method ?? "—",
    paymentStatus: row.payment_status,
    status: row.status,
    customerName: recipient.name,
    customerEmail: recipient.email,
    customerPhone: recipient.phone,
    shippingAddressLine: formatShippingLine(ship),
    itemsHtml: buildItemsHtml(items, Number(row.delivery_fee_egp)),
    lang,
  };
}

export function orderDisplayNumber(ctx: OrderNotificationContext): string {
  return ctx.orderCode ?? String(ctx.orderNumber);
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.APP_BASE_URL?.replace(/\/$/, "") ??
    "https://cookie-bite.com"
  );
}
