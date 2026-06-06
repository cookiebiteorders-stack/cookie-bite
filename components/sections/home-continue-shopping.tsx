"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { ViewReveal } from "@/components/motion/view-reveal";
import { useLanguage } from "@/components/providers/language-provider";
import type { Product } from "@/lib/data";
import {
  getRecentlyViewed,
  type RecentlyViewedEntry,
} from "@/lib/storefront/recently-viewed";
function entryToProduct(entry: RecentlyViewedEntry): Product {
  return {
    id: entry.slug,
    productUuid: entry.productUuid,
    name: entry.name,
    description: "",
    price: entry.price,
    image: entry.image,
    category: "Classic",
  };
}

export function HomeContinueShopping() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<RecentlyViewedEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEntries(getRecentlyViewed().slice(0, 4));
  }, []);

  if (!mounted || entries.length === 0) return null;

  return (
    <section
      className="border-y border-cb-border/60 bg-cb-cream py-12 md:py-16"
      aria-labelledby="home-continue-heading"
    >
      <div className="mx-auto max-w-7xl cb-gutter">
        <ViewReveal variant="tilt-up" className="mb-8">
          <SectionHeading
            align="left"
            variant="editorial"
            className="text-start"
            eyebrow={t("home.continueShopping.eyebrow")}
            title={<span id="home-continue-heading">{t("home.continueShopping.title")}</span>}
            subtitle={t("home.continueShopping.subtitle")}
          />
        </ViewReveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {entries.map((entry) => (
            <ProductCard key={entry.slug} product={entryToProduct(entry)} layout="compact" />
          ))}
        </div>
      </div>
    </section>
  );
}
