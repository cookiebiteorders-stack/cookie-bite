"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingBag } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import type { Product } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  ProductAddonPicker,
  useAddonSelectionState,
} from "@/components/product/product-addon-picker";
import { ProductPriceDisplay } from "@/components/product/product-price-display";
import { ProductSharedImage } from "@/components/product/product-shared-image";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { trackProductEvent } from "@/lib/analytics/track-event";
import { validateAddonSelection } from "@/lib/addons/selection";
import { buttonClassName } from "@/components/ui/button";
import { PRODUCT_PLACEHOLDER_IMAGE } from "@/lib/products/media";
import { isProductOutOfStock } from "@/lib/products/stock";

type Props = {
  product: Product;
  layout?: "grid" | "compact";
  className?: string;
  /** يُدار من صفحة المتجر لتفادي طلبات متكررة */
  wishlisted?: boolean;
  onWishlistToggled?: (productUuid: string, nowSaved: boolean) => void;
};

const badgeKey: Record<string, string> = {
  bestseller: "product.badgeBestseller",
  new: "product.badgeNew",
  trending: "product.badgeTrending",
  featured: "product.badgeFeatured",
};

export function ProductCard({
  product,
  layout = "grid",
  className,
  wishlisted = false,
  onWishlistToggled,
}: Props) {
  const { t, formatPrice } = useLanguage();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { addItem } = useCart();
  const [busy, setBusy] = useState(false);
  const [uncontrolledSaved, setUncontrolledSaved] = useState(false);
  const [addonError, setAddonError] = useState<string | null>(null);
  const linkedAddons = product.linkedAddons ?? [];
  const { addons, selected, setSelected, selectedAddons, addonsTotal } =
    useAddonSelectionState(linkedAddons, { emptyOptional: true });

  const uuid = product.productUuid;
  const outOfStock = isProductOutOfStock(product.stock);
  const unitPrice = product.price + addonsTotal;
  const isPlaceholderImage = product.image === PRODUCT_PLACEHOLDER_IMAGE;
  const controlled = onWishlistToggled !== undefined;
  const saved = controlled ? wishlisted : uncontrolledSaved;

  async function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!uuid || busy) return;
    if (!isSignedIn) {
      router.push(
        `/sign-in?redirect_url=${encodeURIComponent(
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/shop",
        )}`,
      );
      return;
    }
    setBusy(true);
    try {
      if (saved) {
        const res = await fetch(`/api/wishlist/${uuid}`, { method: "DELETE" });
        if (res.ok) {
          if (controlled) onWishlistToggled!(uuid, false);
          else setUncontrolledSaved(false);
        }
      } else {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: uuid }),
        });
        if (res.ok) {
          if (controlled) onWishlistToggled!(uuid, true);
          else setUncontrolledSaved(true);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={cn(
        "cb-pl-product-card group flex flex-col overflow-hidden",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-cb-peach/40">
        <Link href={`/shop/${product.id}`} prefetch={false} className="absolute inset-0 block">
          <ProductSharedImage
            productId={product.id}
            src={product.image}
            alt={product.name}
            sizes="(max-width:768px) 100vw, 25vw"
            imgClassName={cn(
              "transition-transform duration-200 group-hover:scale-[1.01]",
              isPlaceholderImage && "object-contain p-3",
            )}
          />
        </Link>
        <button
          type="button"
          disabled={busy || !uuid}
          onClick={toggleWishlist}
          className={cn(
            "absolute end-3 top-3 z-10 rounded-full border border-cb-peach-deep/60 p-2 shadow-sm transition-colors duration-150 disabled:opacity-40",
            wishlisted
              ? "bg-cb-terracotta-dark text-white"
              : "bg-cb-cream/95 text-cb-terracotta-dark",
          )}
          aria-label={t("product.favoritesAria")}
          aria-pressed={saved}
        >
          <Heart className={cn("h-4 w-4", saved && "fill-current")} />
        </button>
        {outOfStock ? (
          <span className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-full bg-stone-900/90 px-3 py-1.5 text-center text-xs font-bold text-white">
            {t("product.outOfStock")}
          </span>
        ) : null}
        {product.badges?.length ? (
          <div className="pointer-events-none absolute start-3 top-3 z-10 flex flex-wrap gap-1">
            {product.badges.map((b) => (
              <span
                key={b}
                className={cn(
                  "cb-pl-product-badge rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm",
                  b === "new" && "is-new",
                  b === "trending" && "is-trending",
                  b === "featured" && "is-featured",
                )}
              >
                {t(badgeKey[b] ?? b)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <Link href={`/shop/${product.id}`} prefetch={false}>
            <h3 className="font-serif text-lg font-semibold text-cb-text-strong hover:text-cb-terracotta-dark">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1 line-clamp-2 text-sm text-cb-text-muted">
            {product.description}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3">
          <ProductPriceDisplay price={product.price} comparePrice={product.comparePrice} size="sm" />
        </div>
        {addons.length > 0 ? (
          <ProductAddonPicker
            variant="compact"
            linkedAddons={addons}
            selected={selected}
            onSelectedChange={setSelected}
          />
        ) : null}
        <div className="flex flex-col gap-2">
          {outOfStock ? (
            <p className="w-full rounded-full border border-cb-border bg-cb-surface-2 py-3 text-center text-sm font-bold text-cb-text-muted">
              {t("product.outOfStock")}
            </p>
          ) : (
            <button
              type="button"
              className={cn(
                buttonClassName("primary"),
                "inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm",
              )}
              onClick={() => {
                const missing = validateAddonSelection(addons, selected);
                if (missing) {
                  setAddonError(t("product.addonsRequired", { name: missing }));
                  return;
                }
                setAddonError(null);
                addItem(product, 1, selectedAddons, addonsTotal);
                if (product.productUuid) {
                  trackProductEvent({
                    product_id: product.productUuid,
                    event_type: "add_to_cart",
                    metadata: { quantity: 1, slug: product.id },
                  });
                } else {
                  trackProductEvent({
                    product_slug: product.id,
                    event_type: "add_to_cart",
                    metadata: { quantity: 1 },
                  });
                }
              }}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden />
              {addons.length > 0
                ? t("product.addToCartWithPrice", { price: formatPrice(unitPrice) })
                : t("product.addToCart")}
            </button>
          )}
          {addonError ? (
            <p className="text-center text-xs font-semibold text-red-700">{addonError}</p>
          ) : null}
          {layout === "compact" ? (
            <Link
              href={`/shop/${product.id}`}
              className="text-center text-sm font-semibold text-cb-terracotta-dark hover:underline"
            >
              {t("product.viewDetails")}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
