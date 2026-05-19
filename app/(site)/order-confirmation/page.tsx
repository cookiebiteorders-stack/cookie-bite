import type { Metadata } from "next";
import Link from "next/link";
import { PurchaseEventsTracker } from "@/components/checkout/purchase-events-tracker";
import { buttonClassName } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Order Confirmation",
  description: "Your Cookie Bite order confirmation.",
  path: "/order-confirmation",
  noIndex: true,
});

type Props = {
  searchParams: Promise<{ order?: string; email?: string }>;
};

export default async function OrderConfirmationPage({ searchParams }: Props) {
  const { order, email } = await searchParams;
  const orderLabel = order?.replace(/^#/, "") ?? null;
  const trackHref =
    orderLabel && email
      ? `/track?order=${encodeURIComponent(orderLabel)}&email=${encodeURIComponent(email)}`
      : orderLabel
        ? `/track?order=${encodeURIComponent(orderLabel)}`
        : "/track";

  return (
    <div className="bg-cb-cream px-4 py-20 text-center">
      <PurchaseEventsTracker enabled />
      <p className="text-4xl" aria-hidden>
        🍪
      </p>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-cb-text-strong">
        تم تأكيد طلبك
      </h1>
      {orderLabel ? (
        <p className="mt-2 font-mono text-sm font-semibold text-cb-terracotta-dark">
          Order #{orderLabel}
        </p>
      ) : null}
      <p className="mx-auto mt-3 max-w-md text-cb-text" dir="rtl">
        شكراً لطلبك من Cookie Bite. سنرسل لك تحديثات على البريد أو واتساب. يمكنك متابعة حالة الطلب
        في أي وقت.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={trackHref}
          className={buttonClassName("primary", "inline-flex rounded-full px-8")}
        >
          تتبّع الطلب
        </Link>
        <Link href="/shop" className={buttonClassName("outline", "inline-flex rounded-full px-8")}>
          متابعة التسوق
        </Link>
      </div>
    </div>
  );
}
