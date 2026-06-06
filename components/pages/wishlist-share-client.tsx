"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import type { Product } from "@/lib/data";
import { fetchJson } from "@/lib/http/fetch-json";

type Props = {
  token: string;
};

type SharePayload = {
  title?: string | null;
  products?: Product[];
};

export function WishlistShareClient({ token }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchJson<SharePayload>(`/api/wishlist/share/${encodeURIComponent(token)}`)
      .then((data) => {
        if (cancelled) return;
        setProducts(data.products ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(t("pages.wishlistShare.notFound"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cb-terracotta-dark" aria-hidden />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-cb-text">{error}</p>
        <Link href="/shop" className={buttonClassName("primary", "mt-6 inline-flex rounded-full px-8")}>
          {t("product.backToShop")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl cb-gutter py-12">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cb-terracotta-dark">
        {t("pages.wishlistShare.eyebrow")}
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-cb-text-strong sm:text-4xl">
        {t("pages.wishlistShare.title")}
      </h1>
      <p className="mt-3 max-w-2xl text-cb-text">{t("pages.wishlistShare.subtitle")}</p>

      {products.length === 0 ? (
        <p className="mt-10 text-sm text-cb-text-muted">{t("pages.wishlistShare.empty")}</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <div className="mt-12 text-center">
        <Link href="/shop" className={buttonClassName("primary", "inline-flex rounded-full px-8")}>
          {t("pages.wishlistShare.shopCta")}
        </Link>
      </div>
    </div>
  );
}
