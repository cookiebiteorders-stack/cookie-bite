import type { Metadata } from "next";
import Link from "next/link";
import { ClearCartOnce } from "@/components/checkout/clear-cart-once";
import { buttonClassName } from "@/components/ui/button";
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

  return (
    <div className="bg-cb-cream px-4 py-20 text-center">
      <ClearCartOnce when={!isFailed} />
      <p className="text-4xl" aria-hidden>
        {isFailed ? "⚠️" : "🍪"}
      </p>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-cb-text-strong">
        {isFailed ? "Payment not completed" : "Thank you!"}
      </h1>
      {orderLabel ? (
        <p className="mt-2 font-mono text-sm font-semibold text-cb-terracotta-dark">
          Order #{orderLabel}
        </p>
      ) : null}
      <p className="mx-auto mt-3 max-w-md text-cb-text">
        {isFailed
          ? "The payment was cancelled or failed. You can retry from checkout or use cash on delivery."
          : "Your order request was received"}
        {!isFailed && orderLabel === "demo" ? " (demo mode)" : ""}
        {!isFailed ? " We’ll confirm by WhatsApp or email shortly." : ""}
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        {isFailed ? (
          <Link href="/checkout" className={buttonClassName("primary", "inline-flex rounded-full px-8")}>
            Retry checkout
          </Link>
        ) : (
          <Link href="/shop" className={buttonClassName("primary", "inline-flex rounded-full px-8")}>
            Continue shopping
          </Link>
        )}
        <Link href="/cart" className={buttonClassName("outline", "inline-flex rounded-full px-8")}>
          Back to cart
        </Link>
      </div>
    </div>
  );
}
