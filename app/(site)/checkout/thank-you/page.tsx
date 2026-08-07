import type { Metadata } from "next";
import { ClearCartOnce } from "@/components/checkout/clear-cart-once";
import { PurchaseEventsTracker } from "@/components/checkout/purchase-events-tracker";
import { ThankYouContent } from "@/components/checkout/thank-you-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Order Confirmation",
  description: "Cookie Bite order confirmation and payment status page.",
  path: "/checkout/thank-you",
  keywords: ["order confirmation", "cookie bite checkout"],
  noIndex: true,
});

type Props = {
  searchParams: Promise<{ ref?: string; order?: string; status?: string; payment_method?: string }>;
};

export default async function ThankYouPage({ searchParams }: Props) {
  const { ref, order, status, payment_method } = await searchParams;
  const isFailed = status === "failed";
  const isPending = status === "pending";
  const isCod = payment_method === "cash_on_delivery";
  const orderLabel = order ?? (ref === "demo" ? "demo" : null);
  const isDemo = orderLabel === "demo";
  const clearCart = !isFailed;

  return (
    <>
      <ClearCartOnce when={clearCart} />
      <PurchaseEventsTracker enabled={!isFailed && !isPending && !isCod} />
      <ThankYouContent
        isFailed={isFailed}
        isPending={isPending}
        isCod={isCod}
        orderLabel={orderLabel}
        isDemo={isDemo}
      />
    </>
  );
}
