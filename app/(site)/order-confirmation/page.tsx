import type { Metadata } from "next";
import Link from "next/link";
import { ClearCartOnce } from "@/components/checkout/clear-cart-once";
import { PurchaseEventsTracker } from "@/components/checkout/purchase-events-tracker";
import { buttonClassName } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/seo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
  
  // SEC-02: Verify payment status from database
  let paymentStatus: "paid" | "pending" | "failed" = "pending";
  let orderExists = false;
  
  if (orderLabel) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data: orderData } = await supabase
        .from("orders")
        .select("payment_status, status")
        .eq("order_code", orderLabel)
        .maybeSingle();
      
      if (orderData) {
        orderExists = true;
        // Only trust payment_status from DB (webhook-verified source of truth)
        if (orderData.payment_status === "paid") {
          paymentStatus = "paid";
        } else if (orderData.payment_status === "failed") {
          paymentStatus = "failed";
        } else {
          paymentStatus = "pending"; // unpaid, processing, etc.
        }
      }
    } catch (err) {
      console.error("Failed to verify order payment status:", err);
      // Treat as pending if verification fails
    }
  }
  
  const trackHref =
    orderLabel && email
      ? `/track?order=${encodeURIComponent(orderLabel)}&email=${encodeURIComponent(email)}`
      : orderLabel
        ? `/track?order=${encodeURIComponent(orderLabel)}`
        : "/track";

  // If order doesn't exist or payment failed, show different message
  if (orderLabel && !orderExists) {
    return (
      <div className="bg-cb-cream px-4 py-20 text-center">
        <p className="text-4xl" aria-hidden>
          ⚠️
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-cb-text-strong">
          Order Not Found
        </h1>
        <p className="mx-auto mt-3 max-w-md text-cb-text" dir="rtl">
          Order #{orderLabel} could not be found. Please check your order number or contact support.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/shop" className={buttonClassName("outline", "inline-flex rounded-full px-8")}>
            Return to Shop
          </Link>
        </div>
      </div>
    );
  }

  if (orderLabel && paymentStatus === "failed") {
    return (
      <div className="bg-cb-cream px-4 py-20 text-center">
        <p className="text-4xl" aria-hidden>
          ❌
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-cb-text-strong">
          Payment Failed
        </h1>
        <p className="mt-2 font-mono text-sm font-semibold text-cb-terracotta-dark">
          Order #{orderLabel}
        </p>
        <p className="mx-auto mt-3 max-w-md text-cb-text" dir="rtl">
          Your payment could not be processed. Please try again or contact support if the problem persists.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/checkout" className={buttonClassName("primary", "inline-flex rounded-full px-8")}>
            Try Again
          </Link>
          <Link href="/shop" className={buttonClassName("outline", "inline-flex rounded-full px-8")}>
            Return to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cb-cream px-4 py-20 text-center">
      <ClearCartOnce when />
      <PurchaseEventsTracker enabled={paymentStatus === "paid"} />
      <p className="text-4xl" aria-hidden>
        🍪
      </p>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-cb-text-strong">
        {paymentStatus === "paid" ? "تم تأكيد طلبك" : "طلبك قيد المعالجة"}
      </h1>
      {orderLabel ? (
        <p className="mt-2 font-mono text-sm font-semibold text-cb-terracotta-dark">
          Order #{orderLabel}
        </p>
      ) : null}
      <p className="mx-auto mt-3 max-w-md text-cb-text" dir="rtl">
        {paymentStatus === "paid" 
          ? "شكراً لطلبك من Cookie Bite. سنرسل لك تحديثات على البريد أو واتساب. يمكنك متابعة حالة الطلب في أي وقت."
          : "جاري معالجة دفعتك. سنقوم بتحديث حالة طلبك بمجرد تأكيد الدفع. يمكنك متابعة حالة الطلب في أي وقت."
        }
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
