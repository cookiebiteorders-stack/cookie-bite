"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { QuantitySelector } from "@/src/components/cart/QuantitySelector";
import { buttonClassName } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { useLanguage } from "@/components/providers/language-provider";

export default function CartPage() {
  const { t } = useLanguage();
  const { lines, setQuantity, removeItem, subtotalEgp, itemCount } = useCart();
  const shipping = subtotalEgp >= siteConfig.freeDeliveryThresholdEgp ? 0 : 15;
  const total = subtotalEgp + shipping;
  const fmt = (n: number) => `${n.toFixed(2)} EGP`;

  return (
    <div className="bg-cb-cream pb-24 pt-10">
      <div className="mx-auto grid max-w-7xl gap-6 cb-gutter lg:grid-cols-[1.65fr_1fr]">
        <section>
          <h1 className="font-serif text-4xl font-semibold text-cb-text-strong">
            {t("pages.cart.title")}
          </h1>
          <p className="mt-2 text-cb-text-muted">{t("pages.cart.subtitle")}</p>

          {lines.length === 0 ? (
            <div className="mt-12 rounded-3xl border border-cb-border bg-cb-surface p-10 text-center">
              <p className="text-cb-text">{t("pages.cart.empty")}</p>
              <Link
                href="/shop"
                className={buttonClassName("primary", "mt-6 inline-flex rounded-full px-8")}
              >
                {t("pages.cart.shopCookies")}
              </Link>
            </div>
          ) : (
            <>
              <ul className="mt-10 space-y-4">
                {lines.map((item) => (
                  <li
                    key={item.productId}
                    className="flex gap-4 rounded-3xl border border-cb-border bg-cb-surface p-4"
                  >
                    <Link
                      href={`/shop/${item.productId}`}
                      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-cb-peach/40"
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                        unoptimized={item.image.startsWith("http")}
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/shop/${item.productId}`}
                        className="font-semibold text-cb-text-strong hover:text-cb-terracotta-dark"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-cb-text-muted">Cookie Bite</p>
                      <p className="text-sm font-bold text-cb-terracotta-dark">
                        {fmt(item.priceEgp)} {t("pages.cart.each")}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <QuantitySelector
                          quantity={item.quantity}
                          onDecrease={() =>
                            setQuantity(item.productId, item.quantity - 1)
                          }
                          onIncrease={() =>
                            setQuantity(item.productId, item.quantity + 1)
                          }
                        />
                        <button
                          type="button"
                          className="ms-auto text-red-700 hover:underline"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <p className="shrink-0 font-bold text-cb-text-strong">
                      {fmt(item.priceEgp * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-cb-border bg-cb-surface p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-cb-text-strong">
            {t("pages.cart.orderSummary")}
          </h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between text-cb-text-muted">
              <span>{t("pages.cart.items")}</span>
              <span>{itemCount}</span>
            </div>
            <div className="flex items-center justify-between text-cb-text-muted">
              <span>{t("pages.cart.subtotal")}</span>
              <span>{fmt(subtotalEgp)}</span>
            </div>
            <div className="flex items-center justify-between text-cb-text-muted">
              <span>{t("pages.cart.savings")}</span>
              <span className="text-emerald-600">−{fmt(0)}</span>
            </div>
            <div className="flex items-center justify-between text-cb-text-muted">
              <span>{t("pages.cart.shipping")}</span>
              <span>{shipping === 0 ? t("pages.cart.free") : fmt(shipping)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-cb-border pt-3 text-base font-bold text-cb-text-strong">
              <span>{t("pages.cart.total")}</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
          <Link
            href="/checkout"
            className={buttonClassName("primary", "mt-5 w-full rounded-md text-center")}
          >
            {t("pages.cart.checkout")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
