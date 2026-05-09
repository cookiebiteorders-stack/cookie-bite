"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useCart } from "@/src/hooks/useCart";
import { QuantitySelector } from "@/src/components/cart/QuantitySelector";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";

export default function CartPage() {
  const { t } = useLanguage();
  const { items, updateQuantity, removeItem, subtotal, savings, totalItems } = useCart();
  const shipping = subtotal > 120 ? 0 : 15;
  const total = subtotal + shipping;
  const fmt = (n: number) => `${n.toFixed(2)} EGP`;

  return (
    <div className="bg-cb-cream pb-24 pt-10">
      <div className="mx-auto grid max-w-7xl gap-6 cb-gutter lg:grid-cols-[1.65fr_1fr]">
        <section>
          <h1 className="font-serif text-4xl font-semibold text-cb-text-strong">
            {t("pages.cart.title")}
          </h1>
          <p className="mt-2 text-cb-text-muted">{t("pages.cart.subtitle")}</p>

          {items.length === 0 ? (
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
                {items.map((item) => (
                <li
                    key={item.id}
                  className="flex gap-4 rounded-3xl border border-cb-border bg-cb-surface p-4"
                >
                  <Link
                      href={`/shop/${item.id}`}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-cb-peach/40"
                  >
                    <Image
                        src={item.image}
                        alt={item.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                        href={`/shop/${item.id}`}
                      className="font-semibold text-cb-text-strong hover:text-cb-terracotta-dark"
                    >
                        {item.name}
                    </Link>
                      <p className="text-xs text-cb-text-muted">{item.brand}</p>
                      <p className="text-sm font-bold text-cb-terracotta-dark">
                        {fmt(item.price)} {t("pages.cart.each")}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        <QuantitySelector
                          quantity={item.quantity}
                          onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
                          onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                        />
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
                      {fmt(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
        </section>

        <aside className="h-fit rounded-2xl border border-cb-border bg-cb-surface p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-cb-text-strong">{t("pages.cart.orderSummary")}</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between text-cb-text-muted">
              <span>{t("pages.cart.items")}</span>
              <span>{totalItems}</span>
            </div>
            <div className="flex items-center justify-between text-cb-text-muted">
              <span>{t("pages.cart.subtotal")}</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-cb-text-muted">
              <span>{t("pages.cart.savings")}</span>
              <span className="text-emerald-600">−{fmt(savings)}</span>
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
          <Link href="/checkout" className={buttonClassName("primary", "mt-5 w-full rounded-md text-center")}>
            {t("pages.cart.checkout")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
