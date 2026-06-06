"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import type { Product } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useAddonSelectionState } from "@/components/product/product-addon-picker";

const ProductAddonPicker = dynamic(
  () =>
    import("@/components/product/product-addon-picker").then((m) => m.ProductAddonPicker),
  { ssr: false, loading: () => null },
);
import { ProductPriceDisplay } from "@/components/product/product-price-display";
import { ProductSharedImage } from "@/components/product/product-shared-image";
import { useLanguage } from "@/components/providers/language-provider";
import { ProductCartActions } from "@/components/product/product-cart-actions";

const ProductQuickViewModal = dynamic(
  () =>
    import("@/components/shop/product-quick-view-modal").then((m) => m.ProductQuickViewModal),
  { ssr: false },
);
import { PRODUCT_PLACEHOLDER_IMAGE } from "@/lib/products/media";
import { isProductOutOfStock } from "@/lib/products/stock";

type Props = {
  product: Product;
  layout?: "grid" | "compact";
  className?: string;
  /** يُدار من صفحة المتجر لتفادي طلبات متكررة */
  wishlisted?: boolean;
  onWishlistToggled?: (productUuid: string, nowSaved: boolean) => void;
  /** شبكة المتجر: بدون shared layout (أخف) */
  sharedLayout?: boolean;
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
  sharedLayout = false,
}: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [uncontrolledSaved, setUncontrolledSaved] = useState(false);
  const [addonError, setAddonError] = useState<string | null>(null);
  const linkedAddons = product.linkedAddons ?? [];
  const { addons, selected, setSelected, selectedAddons, addonsTotal } =
    useAddonSelectionState(linkedAddons, { emptyOptional: true });

  const uuid = product.productUuid;
  const outOfStock = isProductOutOfStock(product.stock);
  const isPlaceholderImage = product.image === PRODUCT_PLACEHOLDER_IMAGE;
  const hoverImage =
    product.images?.[1] && product.images[1] !== product.image
      ? product.images[1]
      : null;
  const controlled = onWishlistToggled !== undefined;
  const saved = controlled ? wishlisted : uncontrolledSaved;

  async function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!uuid || busy) return;
    setBusy(true);
    const redirectUrl = encodeURIComponent(
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/shop",
    );
    try {
      if (saved) {
        const res = await fetch(`/api/wishlist/${uuid}`, { method: "DELETE" });
        if (res.status === 401) {
          router.push(`/sign-in?redirect_url=${redirectUrl}`);
          return;
        }
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
        if (res.status === 401) {
          router.push(`/sign-in?redirect_url=${redirectUrl}`);
          return;
        }
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
        <button
          type="button"
          className="absolute inset-0 block w-full cursor-zoom-in text-start"
          onClick={() => setQuickViewOpen(true)}
          aria-label={t("search.quickView")}
        >
          <ProductSharedImage
            productId={product.id}
            src={product.image}
            alt={product.name}
            sizes="(max-width:768px) 50vw, 25vw"
            sharedLayout={sharedLayout}
            imgClassName={cn(
              "transition-all duration-300 group-hover:scale-[1.01]",
              hoverImage && "group-hover:opacity-0",
              isPlaceholderImage && "object-contain p-3",
            )}
          />
          {hoverImage ? (
            <Image
              src={hoverImage}
              alt=""
              fill
              sizes="(max-width:768px) 100vw, 25vw"
              className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
          ) : null}
        </button>
        <span className="pointer-events-none absolute bottom-3 start-3 z-10 rounded-full bg-cb-surface/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cb-text-strong opacity-0 shadow-sm transition group-hover:opacity-100">
          {t("search.quickView")}
        </span>
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
          <ProductCartActions
            product={product}
            addons={addons}
            selected={selected}
            selectedAddons={selectedAddons}
            addonsTotal={addonsTotal}
            variant="card"
            onAddonError={setAddonError}
          />
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
      <ProductQuickViewModal
        product={product}
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </article>
  );
}
