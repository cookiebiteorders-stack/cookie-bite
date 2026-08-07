"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCTS } from "@/src/data/products";
import { StarRating } from "@/src/components/ui/StarRating";
import { SearchProductCard } from "@/src/components/search/ProductCard";
import { buttonClassName } from "@/components/ui/button";
import { useCart } from "@/src/hooks/useCart";
import { useToast } from "@/src/hooks/useToast";

export function ProductDetailPageClient({ slug }: { slug: string }) {
  const product = PRODUCTS.find((p) => p.id === slug);
  const { addItem, openDrawer } = useCart();
  const toast = useToast();

  if (!product) notFound();

  const related = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-cb-surface">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width:1024px) 100vw, 50vw"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-cb-text-muted">{product.brand}</p>
          <h1 className="mt-2 font-layout-heading text-3xl font-semibold text-cb-text-strong">
            {product.name}
          </h1>
          <div className="mt-3">
            <StarRating rating={product.rating} count={product.reviewCount} />
          </div>
          <p className="mt-4 text-sm text-cb-text-muted">{product.description}</p>
          <p className="mt-4 text-2xl font-bold text-cb-text-strong">${product.price}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                addItem({
                  id: product.id,
                  name: product.name,
                  brand: product.brand,
                  price: product.price,
                  originalPrice: product.originalPrice,
                  image: product.images[0],
                  maxStock: product.stockCount || 1,
                });
                toast.cart("Added to cart", product.name);
                openDrawer();
              }}
              className={buttonClassName("primary", "rounded-md px-6")}
            >
              Add to Cart
            </button>
            <Link href="/checkout" className={buttonClassName("outline", "rounded-md px-6")}>
              Go to Cart
            </Link>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="font-layout-heading text-2xl font-semibold text-cb-text-strong">
          You May Also Like
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {related.map((item) => (
            <SearchProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

