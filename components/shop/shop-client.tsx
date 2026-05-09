"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PRODUCTS, type Product } from "@/lib/data";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const categories = [
  "All",
  "Classic",
  "Chocolate Lovers",
  "Stuffed",
  "Premium",
  "Seasonal",
] as const;

type ShopCategory = (typeof categories)[number];

function isShopCategory(v: string): v is ShopCategory {
  return (categories as readonly string[]).includes(v);
}

export function ShopClient() {
  const searchParams = useSearchParams();
  const [cat, setCat] = useState<ShopCategory>(() => {
    const raw = searchParams.get("cat");
    return raw && isShopCategory(raw) ? raw : "All";
  });
  const [onlyBest, setOnlyBest] = useState(false);

  const filtered = useMemo(() => {
    let list: Product[] = PRODUCTS;
    if (cat !== "All") {
      list = list.filter((p) => p.category === cat);
    }
    if (onlyBest) {
      list = list.filter((p) => p.badges?.includes("bestseller"));
    }
    return list;
  }, [cat, onlyBest]);

  return (
    <div className="bg-cb-cream pb-20 pt-10">
      <div className="mx-auto max-w-7xl cb-gutter">
        <SectionHeading
          align="left"
          className="mb-8 text-left"
          eyebrow="Shop"
          title="Find your perfect bite"
          subtitle="Filter by mood — classic comfort, chocolate depth, or seasonal surprise."
        />

        <div
          className={cn(
            "mb-6 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:thin]",
            "sm:flex-wrap sm:overflow-visible",
            "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cb-peach-deep/45",
          )}
        >
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={cn(
                "shrink-0 snap-start rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cb-focus focus-visible:ring-offset-2 focus-visible:ring-offset-cb-cream",
                cat === c
                  ? "bg-cb-terracotta-dark text-white shadow"
                  : "bg-cb-surface text-cb-text-strong ring-1 ring-cb-border hover:bg-cb-peach hover:ring-cb-border-strong",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <p className="mb-6 text-sm font-medium text-cb-text-muted">
          Showing {filtered.length} of {PRODUCTS.length} products
        </p>

        <div className="mb-10 flex flex-wrap items-center gap-4 text-sm font-medium text-cb-text">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={onlyBest}
              onChange={(e) => setOnlyBest(e.target.checked)}
              className="h-4 w-4 rounded border-2 border-cb-border-strong text-cb-terracotta-dark accent-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus focus-visible:ring-offset-2 focus-visible:ring-offset-cb-cream"
            />
            Best sellers only
          </label>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="py-16 text-center text-cb-text">
            No cookies match these filters — try another category.
          </p>
        ) : null}

        <div className="mt-12 flex justify-center">
          <button
            type="button"
            className={buttonClassName("outline", "px-10")}
          >
            View more cookies
          </button>
        </div>
      </div>
    </div>
  );
}
