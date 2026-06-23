"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/data";
import { EMPTY_LINKED_ADDONS } from "@/lib/addons/constants";
import {
  ProductAddonPicker,
  useAddonSelectionState,
} from "@/components/product/product-addon-picker";
import { ProductCardImageCarousel } from "@/components/product/product-card-image-carousel";
import { ProductCartActions } from "@/components/product/product-cart-actions";
import { ProductPriceDisplay } from "@/components/product/product-price-display";
import { cn } from "@/lib/utils";

type Props = {
  product: Product;
  className?: string;
};

export function CarouselProductCard({ product, className }: Props) {
  const router = useRouter();
  const [addonError, setAddonError] = useState<string | null>(null);
  const linkedAddons = product.linkedAddons ?? EMPTY_LINKED_ADDONS;
  const { addons, selected, setSelected, selectedAddons, addonsTotal } =
    useAddonSelectionState(linkedAddons, { emptyOptional: true });
  const galleryImages = product.images?.length ? product.images : [product.image];

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-cb-peach-deep/80 bg-cb-cream cb-shadow-editorial cb-shadow-editorial-hover",
        className,
      )}
    >
      <div className="relative aspect-square shrink-0 overflow-hidden">
        <ProductCardImageCarousel
          productId={product.id}
          productName={product.name}
          images={galleryImages}
          sizes="(max-width:1024px) 50vw, 25vw"
          onImageClick={() => router.push(`/shop/${product.id}`)}
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 px-5 pb-6 pt-5 text-center">
        <Link href={`/shop/${product.id}`} prefetch={false}>
          <h3 className="font-serif text-lg font-semibold text-cb-text-strong transition-colors hover:text-cb-terracotta-dark">
            {product.name}
          </h3>
        </Link>
        <div className="flex justify-center">
          <ProductPriceDisplay
            price={product.price}
            comparePrice={product.comparePrice}
            size="sm"
            className="items-center text-center"
          />
        </div>
        {addons.length > 0 ? (
          <div
            className="text-start"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <ProductAddonPicker
              variant="compact"
              linkedAddons={addons}
              selected={selected}
              onSelectedChange={setSelected}
            />
          </div>
        ) : null}
        <div
          className="mt-auto w-full"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
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
            <p className="mt-1.5 text-center text-xs font-semibold text-red-700">{addonError}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
