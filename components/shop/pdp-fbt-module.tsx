"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/data";
import { trackGa4Event } from "@/lib/analytics/ga4";
import { trackProductEvent } from "@/lib/analytics/track-event";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { ProductPriceDisplay } from "@/components/product/product-price-display";
import { buttonClassName } from "@/components/ui/button";
import { isProductOutOfStock } from "@/lib/products/stock";
import { cn } from "@/lib/utils";

type Props = {
  product: Product;
  companions: Product[];
};

export function PdpFbtModule({ product, companions }: Props) {
  const { t, formatPrice } = useLanguage();
  const { addItem, openDrawer } = useCart();

  if (!companions.length) return null;

  const bundle = [product, ...companions];
  const anyOos = bundle.some((p) => isProductOutOfStock(p.stock));
  const total = bundle.reduce((sum, p) => sum + p.price, 0);
  const compareTotal = bundle.reduce(
    (sum, p) => sum + (p.comparePrice != null && p.comparePrice > p.price ? p.comparePrice : p.price),
    0,
  );
  const savings = compareTotal > total ? compareTotal - total : 0;

  const addAll = () => {
    for (const p of bundle) {
      if (isProductOutOfStock(p.stock)) continue;
      addItem(p, 1);
      if (p.productUuid) {
        trackProductEvent({
          product_id: p.productUuid,
          event_type: "add_to_cart",
          metadata: { quantity: 1, slug: p.id, source: "fbt_bundle" },
        });
      } else {
        trackProductEvent({
          product_slug: p.id,
          event_type: "add_to_cart",
          metadata: { quantity: 1, source: "fbt_bundle" },
        });
      }
    }
    trackGa4Event("add_to_cart", {
      currency: "EGP",
      value: total,
      item_count: bundle.length,
      bundle_type: "fbt",
    });
    openDrawer();
  };

  return (
    <section
      className="mt-10 rounded-3xl border border-cb-border bg-cb-surface p-5 sm:p-6"
      aria-labelledby="pdp-fbt-heading"
    >
      <h2
        id="pdp-fbt-heading"
        className="font-serif text-xl font-semibold text-cb-text-strong sm:text-2xl"
      >
        {t("product.fbtTitle")}
      </h2>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {bundle.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 sm:gap-4">
            {i > 0 ? (
              <Plus className="hidden h-5 w-5 shrink-0 text-cb-text-muted sm:block" aria-hidden />
            ) : null}
            <Link
              href={`/shop/${p.id}`}
              className="group flex w-[7.5rem] flex-col items-center gap-2 sm:w-28"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-cb-peach/40 ring-1 ring-cb-border">
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="112px"
                  className="object-cover transition group-hover:scale-[1.02]"
                />
              </div>
              <span className="line-clamp-2 text-center text-xs font-semibold text-cb-text-strong group-hover:text-cb-terracotta-dark">
                {p.name}
              </span>
              <ProductPriceDisplay price={p.price} comparePrice={p.comparePrice} size="sm" />
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-start">
          <p className="text-sm font-medium text-cb-text-muted">{t("product.fbtTotal")}</p>
          <p className="font-serif text-2xl font-bold text-cb-text-strong">
            {formatPrice(total)}
          </p>
          {savings > 0 ? (
            <p className="text-sm font-semibold text-emerald-700">
              {t("product.fbtSavings", { amount: formatPrice(savings) })}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={anyOos}
          onClick={addAll}
          className={cn(
            buttonClassName("primary"),
            "inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5 sm:w-auto",
          )}
        >
          <ShoppingBag className="h-5 w-5" aria-hidden />
          {t("product.fbtAddAll", { price: formatPrice(total) })}
        </button>
      </div>
      {anyOos ? (
        <p className="mt-3 text-center text-xs font-semibold text-amber-800">
          {t("product.fbtPartialStock")}
        </p>
      ) : null}
    </section>
  );
}
