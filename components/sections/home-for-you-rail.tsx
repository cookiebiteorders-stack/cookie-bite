"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { ViewReveal } from "@/components/motion/view-reveal";
import { useLanguage } from "@/components/providers/language-provider";
import type { Product } from "@/lib/data";
import { getRecentlyViewed } from "@/lib/storefront/recently-viewed";
import { sortByBestMatch } from "@/lib/storefront/best-match-sort";

type Props = {
  trending: Product[];
};

export function HomeForYouRail({ trending }: Props) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const products = useMemo(() => {
    if (!mounted || trending.length === 0) return [];
    const recent = getRecentlyViewed();
    const recentSlugs = recent.map((e) => e.slug);
    const recentUuids = recent
      .map((e) => e.productUuid)
      .filter((id): id is string => Boolean(id));

    const catalogLike = trending.map((p) => ({
      ...p,
      inStock: p.stock == null || p.stock > 0,
      createdAt: "",
    }));

    return sortByBestMatch(catalogLike, {
      recentSlugs,
      recentProductUuids: recentUuids,
      cartProductUuids: [],
      trendingSlugs: trending.map((p) => p.id),
    }).slice(0, 8);
  }, [mounted, trending]);

  if (!mounted || products.length < 2) return null;

  return (
    <section
      className="bg-cb-surface py-12 md:py-16"
      aria-labelledby="home-for-you-heading"
    >
      <div className="mx-auto max-w-7xl cb-gutter">
        <ViewReveal variant="tilt-up" className="mb-8">
          <SectionHeading
            align="left"
            variant="editorial"
            className="text-start"
            eyebrow={t("home.forYou.eyebrow")}
            title={<span id="home-for-you-heading">{t("home.forYou.title")}</span>}
            subtitle={t("home.forYou.subtitle")}
          />
        </ViewReveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={`for-you-${p.id}`} product={p} layout="compact" />
          ))}
        </div>
      </div>
    </section>
  );
}
