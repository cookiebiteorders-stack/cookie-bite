import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo";
import { resolvePaymobHmacSecret } from "@/lib/paymob/env";
import { verifyPaymobResponseHmac } from "@/lib/paymob/hmac";

export const metadata: Metadata = buildPageMetadata({
  title: "Payment Response",
  description: "Paymob payment response handler for Cookie Bite checkout.",
  path: "/checkout/paymob-response",
  keywords: ["paymob callback", "payment response", "checkout status"],
  noIndex: true,
});

function toBool(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "success";
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function flatParams(
  q: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(q)) {
    out[key] = first(value);
  }
  return out;
}

/**
 * Browser return from Paymob Unified Checkout.
 * Payment status truth source remains the webhook — this page is UX only.
 * Optional HMAC check when Paymob includes hmac on the redirect query.
 */
export default async function PaymobResponsePage({ searchParams }: Props) {
  const q = await searchParams;
  const params = flatParams(q);
  const hmac = params.hmac;
  const secret = resolvePaymobHmacSecret();

  if (hmac && secret) {
    const ok = verifyPaymobResponseHmac(params, hmac, secret);
    if (!ok) {
      console.error("Paymob redirect: HMAC mismatch");
      redirect("/checkout/thank-you?status=failed");
    }
  }

  const pending = toBool(params.pending);
  const success =
    !pending && (toBool(params.success) || toBool(params.is_success));

  const order =
    params.merchant_order_id ??
    params.order ??
    params.order_id ??
    "";

  if (success && order) {
    redirect(`/order-confirmation?order=${encodeURIComponent(order)}`);
  }

  const target = new URLSearchParams();
  if (pending) {
    target.set("status", "pending");
  } else {
    target.set("status", success ? "success" : "failed");
  }
  if (order) target.set("order", order);
  redirect(`/checkout/thank-you?${target.toString()}`);
}
