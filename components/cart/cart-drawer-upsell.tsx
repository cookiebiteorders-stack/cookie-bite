"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import type { Product } from "@/lib/data";
import { fetchJson } from "@/lib/http/fetch-json";
import { trackGa4Event } from "@/lib/analytics/ga4";
import { trackProductEvent } from "@/lib/analytics/track-event";
import { isProductOutOfStock } from "@/lib/products/stock";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { ProductPriceDisplay } from "@/components/product/product-price-display";
import { buttonClassName } from "@/components/ui/button";

type ApiResponse = {
  fbt?: Product[];
};

type Props = {
  sourceProductId: string;
};

export function CartDrawerUpsell({ sourceProductId }: Props) {
  const { lines, addItem } = useCart();
  const { lang, t, formatPrice } = useLanguage();
  const [companions, setCompanions] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const cartProductIds = useMemo(
    () => new Set(lines.filter((l) => !l.giftBox).map((l) => l.productId)),
    [lines],
  );

  const upsell = useMemo(() => {
    return companions.find(
      (p) => p.id !== sourceProductId && !cartProductIds.has(p.id) && !isProductOutOfStock(p.stock),
    );
  }, [companions, sourceProductId, cartProductIds]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await fetchJson<ApiResponse>(
          `/api/products/${encodeURIComponent(sourceProductId)}?lang=${lang}&fbt=1`,
          { cache: "no-store" },
        );
        if (cancelled) return;
        setCompanions((data.fbt ?? []).filter((p) => p.id !== sourceProductId));
      } catch {
        if (!cancelled) setCompanions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceProductId, lang]);

  useEffect(() => {
    if (!upsell) return;
    trackGa4Event("upsell_viewed", {
      product_id: sourceProductId,
      upsell_product_id: upsell.id,
      placement: "cart_drawer",
    });
  }, [upsell, sourceProductId]);

  if (loading || !upsell) return null;

  const onAdd = () => {
    addItem(upsell, 1);
    trackGa4Event("upsell_clicked", {
      source_id: sourceProductId,
      target_id: upsell.id,
      placement: "cart_drawer",
    });
    trackGa4Event("add_to_cart", {
      currency: "EGP",
      value: upsell.price,
      item_count: 1,
      source: "drawer_upsell",
    });
    if (upsell.productUuid) {
      trackProductEvent({
        product_id: upsell.productUuid,
        event_type: "add_to_cart",
        metadata: { quantity: 1, slug: upsell.id, source: "drawer_upsell" },
      });
    } else {
      trackProductEvent({
        product_slug: upsell.id,
        event_type: "add_to_cart",
        metadata: { quantity: 1, source: "drawer_upsell" },
      });
    }
  };

  return (
    <section
      className="mt-4 rounded-2xl border border-cb-brand-200/80 bg-gradient-to-br from-cb-peach/40 to-cb-surface p-3"
      aria-labelledby="cart-drawer-upsell-title"
    >
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-cb-brand-600" aria-hidden />
        <h3
          id="cart-drawer-upsell-title"
          className="text-sm font-bold text-cb-text-strong"
        >
          {t("pages.cart.drawerUpsellTitle")}
        </h3>
      </div>
      <div className="flex gap-3">
        <Link
          href={`/shop/${upsell.id}`}
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-cb-peach/50 ring-1 ring-cb-border/50"
        >
          <Image
            src={upsell.image}
            alt=""
            fill
            className="object-cover"
            sizes="64px"
            loading="lazy"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/shop/${upsell.id}`}
            className="line-clamp-2 text-sm font-semibold text-cb-text-strong transition hover:text-cb-brand-600"
          >
            {upsell.name}
          </Link>
          <ProductPriceDisplay
            price={upsell.price}
            comparePrice={upsell.comparePrice}
            className="mt-0.5 text-sm"
          />
          <button
            type="button"
            onClick={onAdd}
            className={buttonClassName(
              "primary",
              "cb-touch-manipulation mt-2 inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
            )}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t("pages.cart.drawerUpsellAdd", { price: formatPrice(upsell.price) })}
          </button>
        </div>
      </div>
    </section>
  );
}
