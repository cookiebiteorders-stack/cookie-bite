"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PRODUCTS, type Product } from "@/lib/data";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";

type SortMode = "newest" | "price_asc" | "price_desc" | "popular";
type BadgeFilter = "bestseller" | "new" | "trending";

function isSortMode(v: string | null): v is SortMode {
  return v === "newest" || v === "price_asc" || v === "price_desc" || v === "popular";
}

function isBadgeFilter(v: string): v is BadgeFilter {
  return v === "bestseller" || v === "new" || v === "trending";
}

type ApiProduct = {
  id: string;
  slug: string;
  name: string;
  title_en: string | null;
  title_ar: string | null;
  description: string | null;
  description_en: string | null;
  description_ar: string | null;
  price_egp: number;
  image_url: string | null;
  images: Array<{ url?: string | null }> | null;
  badges: string[] | null;
  category: string | null;
  is_active: boolean;
  stock: number;
  created_at: string;
};

type ShopProduct = Product & {
  inStock: boolean;
  createdAt: string;
};

function normalizeProduct(p: ApiProduct, descFallback: string): ShopProduct {
  const title = p.title_en || p.title_ar || p.name;
  const description =
    p.description_en || p.description_ar || p.description || descFallback;
  const mainImage =
    p.images?.find((img) => typeof img?.url === "string" && img.url)?.url ||
    p.image_url ||
    "/images/web-logo.png";
  const normalizedBadges = (p.badges ?? []).filter(isBadgeFilter);

  return {
    id: p.slug || p.id,
    name: title,
    description,
    price: p.price_egp,
    image: mainImage,
    category: p.category || "Classic",
    badges: normalizedBadges.length ? normalizedBadges : undefined,
    inStock: p.stock > 0,
    createdAt: p.created_at,
  };
}

async function fetchAllProducts(): Promise<ApiProduct[]> {
  const limit = 48;
  let page = 1;
  let totalPages = 1;
  const all: ApiProduct[] = [];

  while (page <= totalPages) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort: "newest",
    });
    const payload = await fetchJson<{
      products?: ApiProduct[];
      total_pages?: number;
    }>(`/api/products?${params.toString()}`, {
      cache: "no-store",
      timeoutMs: 12000,
      retries: 1,
      retryDelayMs: 350,
    });
    all.push(...(payload.products ?? []));
    totalPages = Math.max(1, Number(payload.total_pages ?? 1));
    page += 1;
  }

  return all;
}

export function ShopClient() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [catalog, setCatalog] = useState<ShopProduct[]>(PRODUCTS as ShopProduct[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cat, setCat] = useState<string>(() => {
    const raw = searchParams.get("cat");
    return raw && raw.trim() ? raw : "All";
  });
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [sort, setSort] = useState<SortMode>(() => {
    const raw = searchParams.get("sort");
    return isSortMode(raw) ? raw : "newest";
  });
  const [onlyBest, setOnlyBest] = useState(() => searchParams.get("best") === "1");
  const [inStockOnly, setInStockOnly] = useState(() => searchParams.get("stock") === "1");
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter | "all">(() => {
    const raw = searchParams.get("badge");
    return raw && isBadgeFilter(raw) ? raw : "all";
  });
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await fetchAllProducts();
        if (!active) return;
        const normalized = rows.map((row) =>
          normalizeProduct(row, t("product.fallbackDescription")),
        );
        setCatalog(normalized);
        const minParam = Number(searchParams.get("min"));
        const maxParam = Number(searchParams.get("max"));
        if (Number.isFinite(minParam)) setMinPrice(minParam);
        if (Number.isFinite(maxParam)) setMaxPrice(maxParam);
      } catch (e) {
        if (!active) return;
        const message =
          e instanceof TypeError && /failed to fetch/i.test(e.message)
            ? t("pages.shop.errorNetwork")
            : e instanceof Error
              ? e.message
              : t("pages.shop.errorLoad");
        setError(message);
        setCatalog([]);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [t]);

  const availableCategories = useMemo(
    () =>
      ["All", ...Array.from(new Set(catalog.map((p) => p.category).filter(Boolean)))].filter(
        Boolean,
      ) as string[],
    [catalog],
  );

  const priceBounds = useMemo(() => {
    if (!catalog.length) return { min: 0, max: 0 };
    let min = catalog[0].price;
    let max = catalog[0].price;
    for (const p of catalog) {
      if (p.price < min) min = p.price;
      if (p.price > max) max = p.price;
    }
    return { min, max };
  }, [catalog]);

  useEffect(() => {
    if (!catalog.length) return;
    if (minPrice == null) setMinPrice(priceBounds.min);
    if (maxPrice == null) setMaxPrice(priceBounds.max);
  }, [catalog, minPrice, maxPrice, priceBounds.min, priceBounds.max]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (cat !== "All") params.set("cat", cat);
    if (query.trim()) params.set("q", query.trim());
    if (sort !== "newest") params.set("sort", sort);
    if (onlyBest) params.set("best", "1");
    if (inStockOnly) params.set("stock", "1");
    if (badgeFilter !== "all") params.set("badge", badgeFilter);
    if (minPrice != null && minPrice > priceBounds.min) params.set("min", String(minPrice));
    if (maxPrice != null && maxPrice < priceBounds.max) params.set("max", String(maxPrice));
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }, [
    cat,
    query,
    sort,
    onlyBest,
    inStockOnly,
    badgeFilter,
    minPrice,
    maxPrice,
    priceBounds.min,
    priceBounds.max,
    pathname,
    router,
  ]);

  const filtered = useMemo(() => {
    let list: ShopProduct[] = catalog;
    const q = query.trim().toLowerCase();
    if (cat !== "All") {
      list = list.filter((p) => p.category === cat);
    }
    if (q) {
      list = list.filter((p) => {
        const hay = `${p.name} ${p.description} ${p.category}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (onlyBest) {
      list = list.filter((p) => p.badges?.includes("bestseller"));
    }
    if (badgeFilter !== "all") {
      list = list.filter((p) => p.badges?.includes(badgeFilter));
    }
    if (inStockOnly) {
      list = list.filter((p) => p.inStock);
    }
    if (minPrice != null) {
      list = list.filter((p) => p.price >= minPrice);
    }
    if (maxPrice != null) {
      list = list.filter((p) => p.price <= maxPrice);
    }
    if (sort === "price_asc") {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      list = [...list].sort((a, b) => b.price - a.price);
    } else {
      // newest/popular fallback with existing shape
      list = [...list];
    }
    return list;
  }, [catalog, cat, query, onlyBest, badgeFilter, inStockOnly, minPrice, maxPrice, sort]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (cat !== "All") count += 1;
    if (query.trim()) count += 1;
    if (sort !== "newest") count += 1;
    if (onlyBest) count += 1;
    if (inStockOnly) count += 1;
    if (badgeFilter !== "all") count += 1;
    if (minPrice != null && minPrice > priceBounds.min) count += 1;
    if (maxPrice != null && maxPrice < priceBounds.max) count += 1;
    return count;
  }, [cat, query, sort, onlyBest, inStockOnly, badgeFilter, minPrice, maxPrice, priceBounds.min, priceBounds.max]);

  const clearAll = () => {
    setCat("All");
    setQuery("");
    setSort("newest");
    setOnlyBest(false);
    setInStockOnly(false);
    setBadgeFilter("all");
    setMinPrice(priceBounds.min);
    setMaxPrice(priceBounds.max);
  };

  return (
    <div className="bg-cb-cream pb-20 pt-10">
      <div className="mx-auto max-w-7xl cb-gutter">
        <SectionHeading
          align="left"
          className="mb-8 text-start"
          eyebrow={t("pages.shop.eyebrow")}
          title={t("pages.shop.title")}
          subtitle={t("pages.shop.subtitle")}
        />

        <div className="mb-5 grid gap-3 rounded-2xl bg-cb-surface-elevated p-4 ring-1 ring-cb-border shadow-sm dark:bg-cb-surface-2 dark:ring-cb-border/80 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("pages.shop.searchPlaceholder")}
            className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong outline-none ring-cb-focus placeholder:text-cb-text-muted/90 focus:ring-2 dark:border-cb-border-strong dark:bg-cb-cream-2 dark:text-cb-text-strong dark:placeholder:text-cb-text-muted"
          />
          <select
            value={sort}
            onChange={(e) => setSort((e.target.value as SortMode) || "newest")}
            className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong outline-none focus:ring-2 focus:ring-cb-focus dark:border-cb-border-strong dark:bg-cb-cream-2 dark:text-cb-text-strong"
          >
            <option value="newest">{t("pages.shop.sortNewest")}</option>
            <option value="popular">{t("pages.shop.sortPopular")}</option>
            <option value="price_asc">{t("pages.shop.sortPriceAsc")}</option>
            <option value="price_desc">{t("pages.shop.sortPriceDesc")}</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={priceBounds.min}
              max={priceBounds.max}
              value={minPrice ?? ""}
              onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : null)}
              placeholder={t("pages.shop.minEgp")}
              className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong outline-none focus:ring-2 focus:ring-cb-focus dark:border-cb-border-strong dark:bg-cb-cream-2 dark:text-cb-text-strong dark:placeholder:text-cb-text-muted"
            />
            <input
              type="number"
              min={priceBounds.min}
              max={priceBounds.max}
              value={maxPrice ?? ""}
              onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
              placeholder={t("pages.shop.maxEgp")}
              className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong outline-none focus:ring-2 focus:ring-cb-focus dark:border-cb-border-strong dark:bg-cb-cream-2 dark:text-cb-text-strong dark:placeholder:text-cb-text-muted"
            />
          </div>
          <button type="button" onClick={clearAll} className={buttonClassName("outline", "w-full")}>
            {t("pages.shop.resetFilters")}
          </button>
        </div>

        <div
          className={cn(
            "mb-6 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:thin]",
            "sm:flex-wrap sm:overflow-visible",
            "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cb-peach-deep/45",
          )}
        >
          {availableCategories.map((c) => (
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
              {c === "All" ? t("pages.shop.categoryAll") : c}
            </button>
          ))}
        </div>

        <div className="mb-10 rounded-2xl bg-cb-surface p-4 ring-1 ring-cb-border/80">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-cb-text-strong">
              {t("pages.shop.showing", { filtered: filtered.length, total: catalog.length })}
            </p>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cb-peach px-2.5 py-1 text-xs font-bold text-cb-text-strong ring-1 ring-cb-border">
                {t("pages.shop.activeCount", { count: activeFilterCount })}
              </span>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-full px-2.5 py-1 text-xs font-bold text-cb-terracotta-dark ring-1 ring-cb-border transition hover:bg-cb-peach"
                >
                  {t("pages.shop.clearAll")}
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-cb-text">
            <button
              type="button"
              onClick={() => setOnlyBest((v) => !v)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1 transition",
                onlyBest
                  ? "bg-cb-terracotta-dark text-white ring-cb-terracotta-dark"
                  : "bg-cb-surface text-cb-text-strong ring-cb-border hover:bg-cb-peach",
              )}
            >
              {t("pages.shop.bestSellersOnly")}
            </button>
            <button
              type="button"
              onClick={() => setInStockOnly((v) => !v)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1 transition",
                inStockOnly
                  ? "bg-cb-terracotta-dark text-white ring-cb-terracotta-dark"
                  : "bg-cb-surface text-cb-text-strong ring-cb-border hover:bg-cb-peach",
              )}
            >
              {t("pages.shop.inStockOnly")}
            </button>
            <div className="h-5 w-px bg-cb-border/70" aria-hidden />
            {(["all", "bestseller", "new", "trending"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBadgeFilter(b)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1 transition",
                  badgeFilter === b
                    ? "bg-cb-terracotta-dark text-white ring-cb-terracotta-dark"
                    : "bg-cb-surface text-cb-text-strong ring-cb-border hover:bg-cb-peach",
                )}
              >
                {b === "all"
                  ? t("pages.shop.allBadges")
                  : b === "bestseller"
                    ? t("product.badgeBestseller")
                    : b === "new"
                      ? t("product.badgeNew")
                      : t("product.badgeTrending")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="py-12 text-center text-cb-text-muted">{t("pages.shop.loadingCookies")}</p>
        ) : null}
        {error ? <p className="py-4 text-center text-sm text-red-600">{error}</p> : null}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {!loading && filtered.length === 0 ? (
          <p className="py-16 text-center text-cb-text">
            {t("pages.shop.noMatch")}
          </p>
        ) : null}

      </div>
    </div>
  );
}
