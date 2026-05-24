/**
 * Paymob Accept API — خطوات: auth token → تسجيل طلب → payment key → iframe.
 * الوثائق: https://developers.paymob.com/paymob-docs
 */

const DEFAULT_API = "https://accept.paymob.com/api";

export function paymobApiBase(): string {
  return (process.env.PAYMOB_API_URL ?? DEFAULT_API).replace(/\/$/, "");
}

export async function paymobAuthToken(apiKey: string): Promise<string> {
  const res = await fetch(`${paymobApiBase()}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  const data = (await res.json()) as { token?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `Paymob auth failed (${res.status})`);
  }
  if (!data.token) throw new Error("Paymob auth: missing token");
  return data.token;
}

export type PaymobLineItem = {
  name: string;
  amount_cents: number;
  description: string;
  quantity: string;
};

export async function paymobRegisterEcommerceOrder(
  authToken: string,
  amountCents: number,
  items: PaymobLineItem[],
): Promise<number> {
  const res = await fetch(`${paymobApiBase()}/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: "false",
      amount_cents: amountCents,
      currency: "EGP",
      items,
    }),
  });
  const data = (await res.json()) as { id?: number; message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `Paymob order register failed (${res.status})`);
  }
  if (typeof data.id !== "number") throw new Error("Paymob order: missing id");
  return data.id;
}

export type PaymobBillingData = Record<string, string>;

export async function paymobCreatePaymentKey(
  authToken: string,
  amountCents: number,
  paymobOrderId: number,
  integrationId: number,
  billingData: PaymobBillingData,
): Promise<string> {
  const res = await fetch(`${paymobApiBase()}/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: paymobOrderId,
      billing_data: billingData,
      currency: "EGP",
      integration_id: integrationId,
    }),
  });
  const data = (await res.json()) as { token?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `Paymob payment_keys failed (${res.status})`);
  }
  if (typeof data.token !== "string") throw new Error("Paymob payment_keys: missing token");
  return data.token;
}

/** رابط الـ iframe الكلاسيكي لـ Accept (يُحدَّث من لوحة Paymob إن لزم). */
export function paymobIframeUrl(paymentToken: string): string {
  return `https://accept.paymob.com/api/acceptance/iframes/${paymentToken}`;
}

export function buildPaymobBillingData(input: {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
}): PaymobBillingData {
  const phone = input.phone.startsWith("+")
    ? input.phone
    : input.phone.startsWith("0")
      ? `+20${input.phone.slice(1)}`
      : `+20${input.phone}`;
  const parts = input.name.trim().split(/\s+/);
  const first = parts[0] ?? "Customer";
  const last = parts.slice(1).join(" ") || ".";
  return {
    apartment: "NA",
    email: input.email || "guest@cookiebite.local",
    floor: "NA",
    first_name: first,
    last_name: last,
    street: input.street.slice(0, 200),
    building: "NA",
    phone_number: phone,
    shipping_method: "NA",
    postal_code: "NA",
    city: input.city.slice(0, 120),
    country: "EG",
  };
}

export function buildPaymobLineItems(
  resolved: { id: string; name: string; unitPrice: number; quantity: number }[],
  deliveryFeeEgp: number,
  discountEgp = 0,
): PaymobLineItem[] {
  const items: PaymobLineItem[] = resolved.map((l) => ({
    name: l.name,
    amount_cents: Math.round(l.unitPrice * l.quantity * 100),
    description: l.id,
    quantity: String(l.quantity),
  }));
  if (discountEgp > 0) {
    items.push({
      name: "Promo discount",
      amount_cents: -Math.round(discountEgp * 100),
      description: "promo",
      quantity: "1",
    });
  }
  if (deliveryFeeEgp > 0) {
    items.push({
      name: "Delivery",
      amount_cents: Math.round(deliveryFeeEgp * 100),
      description: "delivery",
      quantity: "1",
    });
  }
  return items;
}

/**
 * استرداد عبر Accept API — يتطلب معرف المعاملة الرقمي من Paymob (ليس معرف الطلب الداخلي).
 * الوثائق / أمثلة SDK: POST `/acceptance/void_refund/refund`
 */
export async function paymobRefundTransaction(
  authToken: string,
  transactionId: number | string,
  amountCents: number,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${paymobApiBase()}/acceptance/void_refund/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      transaction_id: transactionId,
      amount_cents: amountCents,
    }),
  });
  const data = (await res.json()) as Record<string, unknown> & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `Paymob refund failed (${res.status})`);
  }
  return data;
}
