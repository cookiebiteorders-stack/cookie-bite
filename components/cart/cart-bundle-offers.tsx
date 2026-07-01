"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Gift, Plus, Sparkles } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { fetchJson } from "@/lib/http/fetch-json";
import type { StorefrontBundleOffer } from "@/lib/offers/storefront";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ApiResponse = {
  offers?: StorefrontBundleOffer[];
};

type Props = {
  variant?: "drawer" | "page";
  className?: string;
};

export function CartBundleOffers({ variant = "drawer", className }: Props) {
  const { lines, addBundleOfferItem } = useCart();
  const { lang, t, formatPrice } = useLanguage();
  const [offers, setOffers] = useState<StorefrontBundleOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const cartOfferIds = useMemo(
    () => new Set(lines.map((l) => l.bundleOffer?.offer_id).filter(Boolean) as string[]),
    [lines],
  );

  const visibleOffers = useMemo(
    () => offers.filter((offer) => !cartOfferIds.has(offer.id)),
    [offers, cartOfferIds],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await fetchJson<ApiResponse>(`/api/offers/active?lang=${lang}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        setOffers(data.offers ?? []);
      } catch {
        if (!cancelled) setOffers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  if (loading || visibleOffers.length === 0) return null;

  return (
    <section
      className={cn(
        variant === "drawer" ? "mt-4 space-y-3" : "mt-8 space-y-4",
        className,
      )}
      aria-labelledby={variant === "drawer" ? "cart-drawer-offers-title" : "cart-page-offers-title"}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-cb-brand-600" aria-hidden />
        <div>
          <h3
            id={variant === "drawer" ? "cart-drawer-offers-title" : "cart-page-offers-title"}
            className={cn(
              "font-bold text-cb-text-strong",
              variant === "drawer" ? "text-sm" : "text-lg",
            )}
          >
            {t("pages.cart.bundleOffersTitle")}
          </h3>
          <p className="text-xs text-cb-text-muted">{t("pages.cart.bundleOffersHint")}</p>
        </div>
      </div>

      <div className={cn("space-y-3", variant === "page" && "grid gap-4 sm:grid-cols-2")}>
        {visibleOffers.map((offer) => (
          <article
            key={offer.id}
            className="rounded-2xl border border-cb-brand-200/80 bg-gradient-to-br from-cb-peach/35 to-cb-surface p-3 sm:p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 shrink-0 text-cb-brand-600" aria-hidden />
                  <h4 className="font-semibold text-cb-text-strong">{offer.name}</h4>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-cb-text-muted">
                  {offer.products.map((product) => (
                    <li key={product.id} className="flex items-center gap-2">
                      <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-cb-peach/50 ring-1 ring-cb-border/40">
                        <Image
                          src={product.image}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="28px"
                          loading="lazy"
                        />
                      </span>
                      <span className="line-clamp-1">{product.name}</span>
                    </li>
                  ))}
                  {offer.addons.map((addon) => (
                    <li key={`${addon.addon_id}:${addon.option_id}`} className="ps-9">
                      + {addon.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0 text-end">
                <p className="text-xs text-cb-text-muted line-through">
                  {formatPrice(offer.original_total_egp)}
                </p>
                <p className="text-base font-bold text-cb-brand-600">
                  {formatPrice(offer.offer_price_egp)}
                </p>
                {offer.savings_egp > 0 ? (
                  <p className="text-xs font-semibold text-emerald-700">
                    {t("pages.cart.bundleOfferSave", { amount: formatPrice(offer.savings_egp) })}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => addBundleOfferItem(offer)}
              className={buttonClassName(
                "primary",
                "cb-touch-manipulation mt-3 inline-flex min-h-[2.5rem] w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold",
              )}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("pages.cart.bundleOfferAdd", { price: formatPrice(offer.offer_price_egp) })}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
