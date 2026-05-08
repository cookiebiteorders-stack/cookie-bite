import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo";

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

export default async function PaymobResponsePage({ searchParams }: Props) {
  const q = await searchParams;
  const success =
    toBool(first(q.success)) || toBool(first(q.is_success));
  const order =
    first(q.merchant_order_id) ??
    first(q.order) ??
    first(q.order_id) ??
    "";

  const target = new URLSearchParams();
  target.set("status", success ? "success" : "failed");
  if (order) target.set("order", order);

  redirect(`/checkout/thank-you?${target.toString()}`);
}
