import { BRAND } from "@/lib/brand";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  appBaseUrl,
  loadOrderNotificationContext,
  orderDisplayNumber,
} from "@/lib/notifications/order-context";

export type RecipientTemplateVars = Record<string, string | number>;

function paymentMethodLabel(method: string): string {
  const m = method.toLowerCase();
  if (m === "cod") return "Cash on delivery";
  if (m === "card") return "Card · Paymob";
  if (m === "wallet") return "Mobile wallet · Paymob";
  return method;
}

/** First token of local-part (before @), title-cased — fallback when no profile name. */
export function firstNameFromEmail(email: string): string {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  const token = local.split(/[.+_-]/).filter(Boolean)[0] ?? "";
  if (!token) return "there";
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function firstNameFromFullName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function baseUrlVars(): RecipientTemplateVars {
  const base = appBaseUrl();
  return {
    shop_url: `${base}/shop`,
    help_url: `${base}/help`,
    privacy_url: `${base}/privacy`,
    unsubscribe_url: `${base}/unsubscribe`,
    company_address: BRAND.location,
    contact_url: `${base}/contact`,
  };
}

async function findLatestOrderIdForEmail(
  email: string,
  userId: string | null,
): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_KEY) return null;
  const supabase = createSupabaseAdminClient();
  const normalized = email.trim().toLowerCase();

  if (userId) {
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.id) return String(data.id);
  }

  const { data: guestOrder } = await supabase
    .from("orders")
    .select("id")
    .ilike("guest_email", normalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return guestOrder?.id ? String(guestOrder.id) : null;
}

/**
 * Build template variables personalized for a recipient email.
 * Uses CRM profile + latest order when available; otherwise derives a name from the address.
 */
export async function resolveRecipientTemplateVars(
  email: string,
): Promise<RecipientTemplateVars> {
  const normalized = email.trim().toLowerCase();
  const base = baseUrlVars();

  let fullName = "";
  let phone: string | null = null;
  let userId: string | null = null;
  let points: number | null = null;

  if (process.env.SUPABASE_SERVICE_KEY) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data: user } = await supabase
        .from("users")
        .select("id, full_name, phone, points")
        .ilike("email", normalized)
        .limit(1)
        .maybeSingle();

      if (user) {
        userId = user.id ? String(user.id) : null;
        fullName = typeof user.full_name === "string" ? user.full_name.trim() : "";
        phone =
          typeof user.phone === "string" && user.phone.trim()
            ? user.phone.trim()
            : null;
        if (typeof user.points === "number" && Number.isFinite(user.points)) {
          points = user.points;
        }
      }
    } catch (error) {
      console.warn("[resolve-recipient-vars] user lookup failed:", error);
    }
  }

  const firstName = fullName
    ? firstNameFromFullName(fullName)
    : firstNameFromEmail(normalized);
  const customerName = fullName || firstName;

  const vars: RecipientTemplateVars = {
    ...base,
    email: normalized,
    recipient_email: normalized,
    first_name: firstName,
    customer_name: customerName,
  };

  if (phone) vars.phone = phone;
  if (points != null) {
    vars.loyalty_points = points;
    vars.points_balance = points;
  }

  const orderId = await findLatestOrderIdForEmail(normalized, userId);
  if (orderId) {
    const ctx = await loadOrderNotificationContext(orderId);
    if (ctx) {
      const orderNum = orderDisplayNumber(ctx);
      const trackBase = appBaseUrl();
      Object.assign(vars, {
        first_name: firstNameFromFullName(ctx.customerName) || firstName,
        customer_name: ctx.customerName,
        order_number: orderNum,
        total_amount: `${ctx.totalEgp.toFixed(2)} EGP`,
        shipping_address: ctx.shippingAddressLine,
        payment_method: paymentMethodLabel(ctx.paymentMethod),
        items_rows: ctx.itemsHtml,
        order_url: `${trackBase}/order-confirmation?order=${encodeURIComponent(orderNum)}`,
        tracking_url: `${trackBase}/track?order=${encodeURIComponent(orderNum)}`,
      });
    }
  }

  return vars;
}
