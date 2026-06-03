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
  searchParams: Promise<{ ref?: string; order?: string; status?: string }>;
};

export default async function ThankYouPage({ searchParams }: Props) {
  const { ref, order, status } = await searchParams;
  const isFailed = status === "failed";
  const orderLabel = order ?? (ref === "demo" ? "demo" : null);
  const isDemo = orderLabel === "demo";

  return (
    <>
      <ClearCartOnce when={!isFailed} />
      <PurchaseEventsTracker enabled={!isFailed} />
      <ThankYouContent isFailed={isFailed} orderLabel={orderLabel} isDemo={isDemo} />
    </>
  );
}
