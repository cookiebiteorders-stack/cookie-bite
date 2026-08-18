/**
 * Paymob Intention API — POST /v1/intention/
 * Docs: https://developers.paymob.com/paymob-docs/developers/intention-apis/create-intention
 */

import {
  paymobNotificationUrl,
  paymobOrigin,
  paymobRedirectionUrl,
  paymobUnifiedCheckoutUrl,
  resolvePaymobSecretKey,
} from "@/lib/paymob/config";

export type PaymobIntentionItem = {
  name: string;
  amount: number;
  description: string;
  quantity: number;
};

export type PaymobIntentionBillingData = Record<string, string>;

export type CreatePaymobIntentionInput = {
  amountCents: number;
  currency?: string;
  integrationId: number;
  items: PaymobIntentionItem[];
  billingData: PaymobIntentionBillingData;
  specialReference: string;
  expirationSeconds?: number;
  notificationUrl?: string;
  redirectionUrl?: string;
  extras?: Record<string, unknown>;
};

export type PaymobIntentionResult = {
  clientSecret: string;
  intentionOrderId: number;
  intentionId: string;
  paymentUrl: string;
  specialReference: string;
};

export class PaymobApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "PaymobApiError";
  }
}

function sanitizeBillingField(value: string | undefined | null, fallback: string, maxLen: number): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

/** Billing data with safe defaults — Paymob rejects empty required fields. */
export function buildPaymobIntentionBillingData(input: {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  country?: string;
  postal_code?: string;
  apartment?: string;
  floor?: string;
  building?: string;
}): PaymobIntentionBillingData {
  const phone = input.phone.startsWith("+")
    ? input.phone
    : input.phone.startsWith("0")
      ? `+20${input.phone.slice(1)}`
      : `+20${input.phone}`;
  const parts = input.name.trim().split(/\s+/);
  const first = sanitizeBillingField(parts[0], "Customer", 50);
  const last = sanitizeBillingField(parts.slice(1).join(" "), ".", 50);
  const city = sanitizeBillingField(input.city, "Cairo", 120);
  const state = sanitizeBillingField(input.state, city, 120);
  const country = sanitizeBillingField(input.country, "EG", 2);
  const postalCode = sanitizeBillingField(input.postal_code, "", 10);
  const apartment = sanitizeBillingField(input.apartment, "", 50);
  const floor = sanitizeBillingField(input.floor, "", 10);
  const building = sanitizeBillingField(input.building, "", 50);
  
  return {
    apartment: apartment || "NA",
    email: sanitizeBillingField(input.email, "guest@cookiebite.local", 120),
    floor: floor || "NA",
    first_name: first,
    last_name: last,
    street: sanitizeBillingField(input.street, "NA", 200),
    building: building || "NA",
    phone_number: phone,
    shipping_method: "delivery",
    postal_code: postalCode || "NA",
    city,
    state,
    country,
  };
}

export function buildPaymobIntentionItems(
  resolved: { id: string; name: string; unitPrice: number; quantity: number }[],
  deliveryFeeEgp: number,
  discountEgp = 0,
  giftWrapFeeEgp = 0,
): PaymobIntentionItem[] {
  const items: PaymobIntentionItem[] = resolved.map((line) => ({
    name: line.name.slice(0, 120),
    amount: Math.round(line.unitPrice * 100),
    description: line.id.slice(0, 200),
    quantity: line.quantity,
  }));

  if (discountEgp > 0) {
    items.push({
      name: "Promo discount",
      amount: -Math.round(discountEgp * 100),
      description: "promo",
      quantity: 1,
    });
  }
  if (deliveryFeeEgp > 0) {
    items.push({
      name: "Delivery",
      amount: Math.round(deliveryFeeEgp * 100),
      description: "delivery",
      quantity: 1,
    });
  }
  if (giftWrapFeeEgp > 0) {
    items.push({
      name: "Gift wrapping",
      amount: Math.round(giftWrapFeeEgp * 100),
      description: "gift_wrap",
      quantity: 1,
    });
  }
  return items;
}

function mapPaymobHttpError(status: number, body: unknown): PaymobApiError {
  const detail =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : undefined;
  const detailMsg =
    typeof detail?.detail === "string"
      ? detail.detail
      : typeof detail?.message === "string"
        ? detail.message
        : undefined;

  const messages: Record<number, string> = {
    401: "Paymob authentication failed — check your secret key (test vs live).",
    403: "Paymob access denied — verify account permissions.",
    404: "Paymob integration ID not found — check PAYMOB_INTEGRATION_ID_* matches your secret key environment.",
    409: "Paymob payment conflict — please retry checkout.",
    422: "Paymob rejected payment data — billing or item fields invalid.",
    429: "Paymob rate limit — please wait a moment and retry.",
    500: "Paymob server error — please retry shortly.",
    502: "Paymob gateway error — please retry shortly.",
    503: "Paymob temporarily unavailable — please retry shortly.",
    504: "Paymob request timed out — please retry.",
  };

  return new PaymobApiError(
    detailMsg ?? messages[status] ?? `Paymob request failed (${status})`,
    status,
    body,
  );
}

export async function createPaymobIntention(
  input: CreatePaymobIntentionInput,
): Promise<PaymobIntentionResult> {
  const secretKey = resolvePaymobSecretKey();
  if (!secretKey) {
    throw new PaymobApiError("Paymob secret key missing", 503);
  }

  // Paymob requires both Card and Wallet Integration IDs in payment_methods array
  // for Wallet option to appear during checkout
  // LIVE Integration IDs
  const paymentMethods = [5765742, 5765741];

  const payload = {
    amount: input.amountCents,
    currency: input.currency ?? "EGP",
    payment_methods: paymentMethods,
    items: input.items,
    billing_data: input.billingData,
    special_reference: input.specialReference,
    expiration: input.expirationSeconds ?? 3600,
    notification_url: input.notificationUrl ?? paymobNotificationUrl(),
    redirection_url: input.redirectionUrl ?? paymobRedirectionUrl(),
    ...(input.extras ? { extras: input.extras } : {}),
  };

  console.log("[Paymob Intention] Payload:", JSON.stringify(payload, null, 2));

  const res = await fetch(`${paymobOrigin()}/v1/intention/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new PaymobApiError(`Paymob returned invalid JSON (${res.status})`, res.status);
  }

  if (!res.ok) {
    throw mapPaymobHttpError(res.status, data);
  }

  const clientSecret =
    typeof data.client_secret === "string" ? data.client_secret : "";
  const intentionOrderId =
    typeof data.intention_order_id === "number"
      ? data.intention_order_id
      : Number(data.intention_order_id);
  const intentionId = typeof data.id === "string" ? data.id : "";

  if (!clientSecret || !Number.isFinite(intentionOrderId)) {
    throw new PaymobApiError("Paymob intention response missing client_secret or order id", 502, data);
  }

  return {
    clientSecret,
    intentionOrderId,
    intentionId,
    paymentUrl: paymobUnifiedCheckoutUrl(clientSecret),
    specialReference: input.specialReference,
  };
}

export { paymobUnifiedCheckoutUrl };
