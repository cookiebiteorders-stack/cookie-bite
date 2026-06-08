import { getTemplate } from "@/lib/notification-library";

/** Vars that must come from CRM / order / event — never from sample data or AI guesses. */
export const PERSONAL_OR_CONTEXT_VARS = new Set([
  "first_name",
  "customer_name",
  "user_name",
  "shipping_address",
  "email",
  "recipient_email",
  "phone",
  "order_number",
  "order_id",
  "order_items",
  "total_amount",
  "total_price",
  "items_rows",
  "tracking_code",
  "order_url",
  "tracking_url",
  "reset_link",
  "email_address",
  "action_date",
  "action_reason",
  "free_shipping_threshold_egp",
]);

export function getTemplateDefaultVars(
  templateKey: string,
): Record<string, string | number> {
  const builder = getTemplate(templateKey);
  if (!builder) return {};
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(builder.meta.sampleVars ?? {})) {
    if (PERSONAL_OR_CONTEXT_VARS.has(key)) continue;
    if (typeof value === "string" || typeof value === "number") {
      out[key] = value;
    }
  }
  return out;
}
