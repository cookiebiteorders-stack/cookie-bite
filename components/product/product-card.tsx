"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingBag } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import type { Product } from "@/lib/data";
import { cn } from "@/lib/utils";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { ProductSharedImage } from "@/components/product/product-shared-image";
import { useLanguage } from "@/components/providers/language-provider";

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
  const { t } = useLanguage();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [uncontrolledSaved, setUncontrolledSaved] = useState(false);

  const uuid = product.productUuid;
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
      data-loki="hover"
      className={cn(
        "cb-pl-product-card group flex flex-col overflow-hidden transition-all duration-200",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-cb-peach/40">
        <Link href={`/shop/${product.id}`} className="absolute inset-0 block">
          <ProductSharedImage
            productId={product.id}
            src={product.image}
            alt={product.name}
            sizes="(max-width:768px) 100vw, 25vw"
            imgClassName="transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>
        <button
          type="button"
          disabled={busy || !uuid}
          onClick={toggleWishlist}
          className={cn(
            "absolute end-3 top-3 z-10 rounded-full border border-cb-peach-deep/60 p-2 shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:opacity-40",
            wishlisted
              ? "bg-cb-terracotta-dark text-white"
              : "bg-cb-cream/95 text-cb-terracotta-dark",
          )}
          aria-label={t("product.favoritesAria")}
          aria-pressed={saved}
        >
          <Heart className={cn("h-4 w-4", saved && "fill-current")} />
        </button>
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
          <Link href={`/shop/${product.id}`}>
            <h3 className="font-serif text-lg font-semibold text-cb-text-strong hover:text-cb-terracotta-dark">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1 line-clamp-2 text-sm text-cb-text-muted">
            {product.description}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3">
          <p className="text-lg font-bold text-cb-terracotta-dark">
            {product.price} EGP
          </p>
        </div>
        {layout === "grid" ? (
          <AddToCartButton
            product={product}
            className="w-full rounded-full py-3 text-sm"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            {t("product.addToCart")}
          </AddToCartButton>
        ) : (
          <Link
            href={`/shop/${product.id}`}
            className="text-sm font-semibold text-cb-terracotta-dark hover:underline"
          >
            {t("product.viewDetails")}
          </Link>
        )}
      </div>
    </article>
  );
}
