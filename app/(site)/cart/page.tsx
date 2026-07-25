"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, Lock, Loader2, CreditCard, Smartphone } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { QuantitySelector } from "@/src/components/cart/QuantitySelector";
import { buttonClassName } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { useLanguage } from "@/components/providers/language-provider";
import { useFreeShippingThreshold } from "@/components/providers/store-commerce-settings-provider";
import { InlineAlerts } from "@/components/announcements/inline-alerts";
import { PromoCodeField } from "@/components/checkout/promo-code-field";
import { CartBundleOffers } from "@/components/cart/cart-bundle-offers";
import { useState } from "react";

export default function CartPage() {
  const { t, formatPrice } = useLanguage();
  const {
    lines,
    setQuantity,
    removeItem,
    subtotalEgp,
    discountEgp,
    itemCount,
    promo,
    applyPromo,
    clearPromo,
  } = useCart();
  const freeShippingThreshold = useFreeShippingThreshold();
  const shipping =
    subtotalEgp >= freeShippingThreshold
      ? 0
      : siteConfig.standardDeliveryFeeEgp;
  const total = Math.max(0, subtotalEgp - discountEgp + shipping);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("card");

  return (
    <div className="bg-cb-cream pb-24 pt-10">
      <div className="mx-auto grid max-w-7xl gap-6 cb-gutter lg:grid-cols-[1.65fr_1fr]">
        <section>
          <h1 className="font-serif text-4xl font-semibold text-cb-text-strong">
            {t("pages.cart.title")}
          </h1>
          <InlineAlerts slot="cart" />
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
              <CartBundleOffers variant="page" className="mt-8 text-start" />
            </div>
          ) : (
            <>
              <ul className="mt-10 space-y-4">
                {lines.map((item) => {
                  const itemHref = item.giftBox
                    ? "/gift-box"
                    : item.bundleOffer
                      ? "/cart"
                      : `/shop/${item.productId}`;
                  return (
                  <li
                    key={item.id}
                    className="flex gap-4 rounded-3xl border border-cb-border bg-cb-surface p-4"
                  >
                    <Link
                      href={itemHref}
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
                        href={itemHref}
                        className="font-semibold text-cb-text-strong hover:text-cb-terracotta-dark"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-cb-text-muted">{t("userMenu.brandFoot")}</p>
                      {item.giftBox ? (
                        <p className="text-xs font-semibold text-cb-terracotta-dark">
                          {t("pages.cart.giftBoxLine", { size: item.giftBox.box_size })}
                        </p>
                      ) : null}
                      {item.bundleOffer ? (
                        <p className="text-xs font-semibold text-cb-terracotta-dark">
                          {t("pages.cart.bundleOfferBadge")}
                        </p>
                      ) : null}
                      <p className="text-sm font-bold text-cb-terracotta-dark">
                        {formatPrice(item.finalUnitPriceEgp)} {t("pages.cart.each")}
                      </p>
                      {item.bundleOffer ? (
                        <ul className="mt-1 space-y-1 text-xs text-cb-text-muted">
                          {item.bundleOffer.products.map((p) => (
                            <li key={p.product_id}>• {p.name}</li>
                          ))}
                          {item.bundleOffer.addons.map((a) => (
                            <li key={`${a.addon_id}:${a.option_id}`}>+ {a.name}</li>
                          ))}
                          {item.bundleOffer.savings_egp > 0 ? (
                            <li className="font-semibold text-emerald-700">
                              {t("pages.cart.bundleOfferSave", {
                                amount: formatPrice(item.bundleOffer.savings_egp),
                              })}
                            </li>
                          ) : null}
                        </ul>
                      ) : null}
                      {item.addons.length > 0 ? (
                        <ul className="mt-1 space-y-1 text-xs text-cb-text-muted">
                          {item.addons.map((addon) => (
                            <li key={addon.addon_id}>
                              {addon.options.map((opt) => `${opt.option_id} × ${opt.quantity}`).join(", ")}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-3 flex items-center gap-2">
                        {item.giftBox || item.bundleOffer ? (
                          <span className="text-xs text-cb-text-muted">{t("pages.cart.quantityFixed")}</span>
                        ) : (
                          <QuantitySelector
                            quantity={item.quantity}
                            onDecrease={() => setQuantity(item.id, item.quantity - 1)}
                            onIncrease={() => setQuantity(item.id, item.quantity + 1)}
                          />
                        )}
                        <button
                          type="button"
                          className="ms-auto text-red-700 hover:underline"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <p className="shrink-0 font-bold text-cb-text-strong">
                        {formatPrice(item.finalUnitPriceEgp * item.quantity)}
                    </p>
                  </li>
                  );
                })}
              </ul>
              <CartBundleOffers variant="page" />
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
              <span>{formatPrice(subtotalEgp)}</span>
            </div>
            <div className="flex items-center justify-between text-cb-text-muted">
              <span>{t("pages.cart.savings")}</span>
              <span className={discountEgp > 0 ? "text-emerald-600" : ""}>
                −{formatPrice(discountEgp)}
              </span>
            </div>
            <div className="flex items-center justify-between text-cb-text-muted">
              <span>{t("pages.cart.shipping")}</span>
              <span>{shipping === 0 ? t("pages.cart.free") : formatPrice(shipping)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-cb-border pt-3 text-base font-bold text-cb-text-strong">
              <span>{t("pages.cart.total")}</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          {lines.length > 0 ? (
            <PromoCodeField
              cartSubtotal={subtotalEgp}
              applied={promo}
              onApply={applyPromo}
              onClear={clearPromo}
              className="mt-4"
            />
          ) : null}
          
          {lines.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-cb-text-strong mb-2">
                {t("pages.cart.paymentMethod")}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition ${
                    paymentMethod === "card"
                      ? "border-cb-brand-500 bg-cb-brand-50"
                      : "border-cb-border bg-cb-surface hover:border-cb-brand-300"
                  }`}
                >
                  <CreditCard className="h-6 w-6 text-cb-text-strong" />
                  <span className="text-sm font-semibold text-cb-text-strong">
                    {t("pages.cart.cardPayment")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("wallet")}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition ${
                    paymentMethod === "wallet"
                      ? "border-cb-brand-500 bg-cb-brand-50"
                      : "border-cb-border bg-cb-surface hover:border-cb-brand-300"
                  }`}
                >
                  <Smartphone className="h-6 w-6 text-cb-text-strong" />
                  <span className="text-sm font-semibold text-cb-text-strong">
                    {t("pages.cart.walletPayment")}
                  </span>
                </button>
              </div>
            </div>
          ) : null}
          <button
            id="proceed-to-payment-btn"
            onClick={() => {
              window.location.href = `/checkout/details?payment_method=${paymentMethod}`;
            }}
            disabled={itemCount === 0}
            className={buttonClassName("primary", "mt-5 w-full rounded-md text-center flex items-center justify-center gap-2 disabled:opacity-50")}
          >
            <Lock className="h-4 w-4" aria-hidden />
            {t("pages.cart.proceedToPayment")}
          </button>
          <p className="mt-2 text-center text-xs text-cb-text-muted">
            {t("pages.cart.securePaymentNote")}
          </p>
        </aside>
      </div>
    </div>
  );
}
