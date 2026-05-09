"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/data";
import { cn } from "@/lib/utils";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { ProductSharedImage } from "@/components/product/product-shared-image";
import { useLanguage } from "@/components/providers/language-provider";

type Props = {
  product: Product;
  layout?: "grid" | "compact";
  className?: string;
};

const badgeKey: Record<NonNullable<Product["badges"]>[number], string> = {
  bestseller: "product.badgeBestseller",
  new: "product.badgeNew",
  trending: "product.badgeTrending",
};

export function ProductCard({ product, layout = "grid", className }: Props) {
  const { t } = useLanguage();

  return (
    <article
      data-loki="hover"
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-cb-peach-deep/70 bg-cb-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cb-border-strong hover:shadow-md",
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
          className="absolute end-3 top-3 z-10 rounded-full border border-cb-peach-deep/60 bg-cb-cream/95 p-2 text-cb-terracotta-dark shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md"
          aria-label={t("product.favoritesAria")}
        >
          <Heart className="h-4 w-4" />
        </button>
        {product.badges?.length ? (
          <div className="pointer-events-none absolute start-3 top-3 z-10 flex flex-wrap gap-1">
            {product.badges.map((b) => (
              <span
                key={b}
                className="rounded-full bg-cb-pink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cb-text-strong shadow-sm"
              >
                {t(badgeKey[b])}
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
