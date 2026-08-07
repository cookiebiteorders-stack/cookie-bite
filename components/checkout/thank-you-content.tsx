"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";

type Props = {
  isFailed: boolean;
  isPending?: boolean;
  isCod?: boolean;
  orderLabel: string | null;
  isDemo: boolean;
};

export function ThankYouContent({ isFailed, isPending = false, isCod = false, orderLabel, isDemo }: Props) {
  const { t, lang } = useLanguage();

  const title = isFailed
    ? t("thankYou.paymentFailed")
    : isCod
      ? lang === "ar"
        ? "تم استلام طلبك"
        : "Order Received"
      : isPending
        ? lang === "ar"
          ? "الدفع قيد المعالجة"
          : "Payment pending"
        : t("thankYou.success");

  const body = isFailed
    ? t("thankYou.failedBody")
    : isCod
      ? lang === "ar"
        ? "تم استلام طلبك بنجاح. يرجى الدفع نقداً عند الاستلام."
        : "Your order has been received successfully. Please pay with cash upon delivery."
      : isPending
        ? lang === "ar"
          ? "استلمنا طلبك وما زال تأكيد الدفع جارياً. ستصلك رسالة عند اكتمال الدفع."
          : "We received your order and payment confirmation is still processing. You will be notified once payment completes."
        : t("thankYou.successBody");

  return (
    <div className="bg-cb-cream px-4 py-20 text-center">
      <p className="text-4xl" aria-hidden>
        {isFailed ? "⚠️" : isPending ? "⏳" : "🍪"}
      </p>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-cb-text-strong">
        {title}
      </h1>
      {orderLabel ? (
        <p className="mt-2 font-mono text-sm font-semibold text-cb-terracotta-dark">
          {t("thankYou.orderRef", { id: orderLabel })}
        </p>
      ) : null}
      <p className="mx-auto mt-3 max-w-md text-cb-text">
        {body}
        {!isFailed && !isPending && isDemo ? t("thankYou.demoNote") : ""}
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {isFailed ? (
          <Link href="/checkout" className={buttonClassName("primary", "inline-flex rounded-full px-8")}>
            {t("thankYou.retryCheckout")}
          </Link>
        ) : (
          <Link href="/shop" className={buttonClassName("primary", "inline-flex rounded-full px-8")}>
            {t("thankYou.continueShopping")}
          </Link>
        )}
        <Link href="/checkout" className={buttonClassName("outline", "inline-flex rounded-full px-8")}>
          {t("thankYou.backToCart")}
        </Link>
      </div>
    </div>
  );
}
