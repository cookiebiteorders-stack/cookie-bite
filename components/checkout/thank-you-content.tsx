"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";

type Props = {
  isFailed: boolean;
  orderLabel: string | null;
  isDemo: boolean;
};

export function ThankYouContent({ isFailed, orderLabel, isDemo }: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-cb-cream px-4 py-20 text-center">
      <p className="text-4xl" aria-hidden>
        {isFailed ? "⚠️" : "🍪"}
      </p>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-cb-text-strong">
        {isFailed ? t("thankYou.paymentFailed") : t("thankYou.success")}
      </h1>
      {orderLabel ? (
        <p className="mt-2 font-mono text-sm font-semibold text-cb-terracotta-dark">
          {t("thankYou.orderRef", { id: orderLabel })}
        </p>
      ) : null}
      <p className="mx-auto mt-3 max-w-md text-cb-text">
        {isFailed ? t("thankYou.failedBody") : t("thankYou.successBody")}
        {!isFailed && isDemo ? t("thankYou.demoNote") : ""}
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
        <Link href="/cart" className={buttonClassName("outline", "inline-flex rounded-full px-8")}>
          {t("thankYou.backToCart")}
        </Link>
      </div>
    </div>
  );
}
