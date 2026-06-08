import {
  firstNameFromEmail,
  resolveRecipientTemplateVars,
} from "@/lib/notification-library/resolve-recipient-vars";
import {
  appBaseUrl,
  loadOrderNotificationContext,
  orderDisplayNumber,
} from "@/lib/notifications/order-context";
import { getTemplateDefaultVars, PERSONAL_OR_CONTEXT_VARS } from "./template-default-vars";
import { getFreeShippingThresholdEgp } from "@/lib/store/commerce-settings-server";

function firstNameFromFullName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function paymentMethodLabel(method: string): string {
  const m = method.toLowerCase();
  if (m === "cod") return "Cash on delivery";
  if (m === "card") return "Card · Paymob";
  if (m === "wallet") return "Mobile wallet · Paymob";
  return method;
}

function toTemplateVarMap(
  input: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

/** Maps legacy `user_name` / order fields from automation triggers. */
export function mapLegacyProvidedData(
  provided: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const out = toTemplateVarMap(provided);
  const userName = typeof out.user_name === "string" ? out.user_name.trim() : "";
  if (userName) {
    if (!out.first_name) out.first_name = firstNameFromFullName(userName);
    if (!out.customer_name) out.customer_name = userName;
  }
  if (typeof out.order_id === "string" && out.order_id && !out.order_number) {
    // order_number filled in enrichFromOrderId when possible
  }
  if (out.total_price !== undefined && out.total_amount === undefined) {
    out.total_amount =
      typeof out.total_price === "number"
        ? `${out.total_price} EGP`
        : String(out.total_price);
  }
  if (typeof out.order_items === "string" && out.order_items && !out.items_rows) {
    out.items_rows = out.order_items;
  }
  return out;
}

export async function enrichFromOrderId(
  orderId: string,
): Promise<Record<string, string | number>> {
  const ctx = await loadOrderNotificationContext(orderId);
  if (!ctx) return {};
  const trackBase = appBaseUrl();
  const orderNum = orderDisplayNumber(ctx);
  return {
    first_name: firstNameFromFullName(ctx.customerName),
    customer_name: ctx.customerName,
    order_number: orderNum,
    total_amount: `${ctx.totalEgp.toFixed(2)} EGP`,
    shipping_address: ctx.shippingAddressLine,
    payment_method: paymentMethodLabel(ctx.paymentMethod),
    items_rows: ctx.itemsHtml,
    order_url: `${trackBase}/order-confirmation?order=${encodeURIComponent(orderNum)}`,
    tracking_url: `${trackBase}/track?order=${encodeURIComponent(orderNum)}`,
  };
}

export type MergeTemplateVarsInput = {
  to: string;
  templateKey: string;
  templateVariables: string[];
  providedData: Record<string, unknown>;
};

export type MergeTemplateVarsResult = {
  merged: Record<string, string | number | boolean>;
  missingForAi: string[];
};

/**
 * Resolves per-recipient variables: CRM profile, order context, template defaults,
 * then legacy trigger fields (highest priority).
 */
export async function mergeAutomationTemplateVars(
  input: MergeTemplateVarsInput,
): Promise<MergeTemplateVarsResult> {
  const defaults = getTemplateDefaultVars(input.templateKey);
  const recipientVars = await resolveRecipientTemplateVars(input.to);
  const legacy = mapLegacyProvidedData(input.providedData);

  const orderId =
    typeof legacy.order_id === "string" && legacy.order_id.trim()
      ? legacy.order_id.trim()
      : null;
  const orderVars = orderId ? await enrichFromOrderId(orderId) : {};
  const freeShippingThresholdEgp = await getFreeShippingThresholdEgp();

  const merged: Record<string, string | number | boolean> = {
    ...defaults,
    ...recipientVars,
    ...orderVars,
    ...legacy,
    free_shipping_threshold_egp: freeShippingThresholdEgp,
  };

  const missingForAi = input.templateVariables.filter((key) => {
    if (PERSONAL_OR_CONTEXT_VARS.has(key)) return false;
    const value = merged[key];
    return value === undefined || value === null || value === "";
  });

  return { merged, missingForAi };
}

/** Fallback first name when only an email address is known. */
export function deriveFirstName(email: string, fullName?: string): string {
  if (fullName?.trim()) return firstNameFromFullName(fullName);
  return firstNameFromEmail(email);
}
