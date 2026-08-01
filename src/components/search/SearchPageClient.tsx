"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useDebounce } from "@/src/hooks/useDebounce";
import { useSearchStore } from "@/src/store/searchStore";
import type { SearchFilters } from "@/src/types/search";
import type { Product } from "@/src/types/product";
import { Input } from "@/src/components/ui/Input";
import { Select } from "@/src/components/ui/Select";
import { RangeSlider } from "@/src/components/ui/RangeSlider";
import { Pagination } from "@/src/components/ui/Pagination";
import { Skeleton } from "@/src/components/ui/Skeleton";
import {
  SearchProductCard,
  SearchProductRow,
} from "@/src/components/search/ProductCard";
import { Badge } from "@/src/components/ui/Badge";
import { buttonClassName } from "@/components/ui/button";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { fetchJson } from "@/lib/http/fetch-json";
import { useLanguage } from "@/components/providers/language-provider";
import { resolveProductImageUrl } from "@/lib/products/media";

const PAGE_SIZE = 9;

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
  compare_price_egp: number | null;
  image_url: string | null;
  images: Array<{ url?: string | null }> | null;
  badges: string[] | null;
  category: string | null;
  is_active: boolean;
  stock: number;
  created_at: string;
};

function normalizeProduct(p: ApiProduct, fallbackDescription: string, lang: "ar" | "en"): Product {
  const title =
    lang === "ar"
      ? p.title_ar || p.title_en || p.name
      : p.title_en || p.title_ar || p.name;
  const description =
    lang === "ar"
      ? p.description_ar || p.description_en || p.description || fallbackDescription
      : p.description_en || p.description_ar || p.description || fallbackDescription;
  const mainImage = resolveProductImageUrl(
    p.images?.find((img) => typeof img?.url === "string" && img.url)?.url || p.image_url,
  );
  const compare = p.compare_price_egp ?? undefined;
  const discount =
    compare && compare > p.price_egp
      ? Math.round(((compare - p.price_egp) / compare) * 100)
      : undefined;

  return {
    id: p.slug || p.id,
    productUuid: p.id,
    name: title,
    brand: "Cookie Bite",
    category: (p.category || "cookies") as Product["category"],
    subcategory: p.category || "cookies",
    price: p.price_egp,
    originalPrice: compare,
    discount,
    rating: 5,
    reviewCount: 0,
    images: [mainImage],
    sizes: [],
    colors: [],
    tags: p.badges ?? [],
    inStock: p.stock > 0,
    stockCount: p.stock,
    isNew: Boolean(p.badges?.includes("new")),
    isFeatured: Boolean(p.badges?.includes("bestseller")),
    description,
    createdAt: p.created_at,
  };
}

async function fetchAllProducts(fallbackDescription: string, lang: "ar" | "en"): Promise<Product[]> {
  const limit = 48;
  let page = 1;
  let totalPages = 1;
  const all: Product[] = [];

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
    const batch = (payload.products ?? []).map((p) =>
      normalizeProduct(p, fallbackDescription, lang),
    );
    all.push(...batch);
    totalPages = Math.max(1, Number(payload.total_pages ?? 1));
    page += 1;
  }

  return all;
}

export function SearchPageClient() {
  const { t, lang } = useLanguage();
  const filters = useSearchStore((s) => s.filters);
  const setFilters = useSearchStore((s) => s.setFilters);
  const clearFilters = useSearchStore((s) => s.clearFilters);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(filters.query, 300);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") as SearchFilters["sort"] | null;
    const page = Number(searchParams.get("page") ?? 1);
    setFilters({
      query: q,
      categories: category ? [category] : [],
      sort: sort ?? "popular",
      page: Number.isFinite(page) ? page : 1,
    });
  }, [searchParams, setFilters]);
  const loading = filters.query !== debouncedQuery;


  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (filters.categories[0]) params.set("category", filters.categories[0]);
    if (filters.sort !== "popular") params.set("sort", filters.sort);
    if (filters.page > 1) params.set("page", String(filters.page));
    router.replace(params.toString() ? `${pathname}?${params}` : pathname);
  }, [filters.query, filters.categories, filters.sort, filters.page, pathname, router]);

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void (async () => {
        try {
          setCatalogLoading(true);
          setCatalogError(null);
          const rows = await fetchAllProducts(t("product.fallbackDescription"), lang);
          setCatalog(rows);
        } catch (e) {
          const message =
            e instanceof TypeError && /failed to fetch/i.test(e.message)
              ? t("search.networkError")
              : e instanceof Error
                ? e.message
                : t("search.genericLoadError");
          setCatalogError(message);
          setCatalog([]);
        } finally {
          setCatalogLoading(false);
        }
      })();
    });
    return cancel;
  }, [t, lang]);

  const categories = useMemo(
    () => Array.from(new Set(catalog.map((p) => p.category))),
    [catalog],
  );
  const brands = useMemo(
    () => Array.from(new Set(catalog.map((p) => p.brand))),
    [catalog],
  );
  const availableSizes = useMemo(
    () => Array.from(new Set(catalog.flatMap((p) => p.sizes))),
    [catalog],
  );
  const availableColors = useMemo(
    () => Array.from(new Set(catalog.flatMap((p) => p.colors.map((c) => c.name)))),
    [catalog],
  );

  const filtered = useMemo(() => {
    return catalog.filter((p) => {
      const q = debouncedQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      const matchCategory =
        !filters.categories.length || filters.categories.includes(p.category);
      const matchPriceMin = filters.minPrice == null || p.price >= filters.minPrice;
      const matchPriceMax = filters.maxPrice == null || p.price <= filters.maxPrice;
      const matchStock = !filters.inStockOnly || p.inStock;
      const matchBrand = !filters.brands.length || filters.brands.includes(p.brand);
      const matchRating = filters.minRating == null || p.rating >= filters.minRating;
      const matchSize =
        !filters.sizes.length || p.sizes.some((size) => filters.sizes.includes(size));
      const matchColor =
        !filters.colors.length ||
        p.colors.some((color) => filters.colors.includes(color.name));
      return (
        matchQuery &&
        matchCategory &&
        matchPriceMin &&
        matchPriceMax &&
        matchStock &&
        matchBrand &&
        matchRating &&
        matchSize &&
        matchColor
      );
    });
  }, [
    catalog,
    debouncedQuery,
    filters.categories,
    filters.minPrice,
    filters.maxPrice,
    filters.inStockOnly,
    filters.brands,
    filters.minRating,
    filters.sizes,
    filters.colors,
  ]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (filters.sort) {
      case "newest":
        list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        break;
      case "price_asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      default:
        list.sort((a, b) => b.reviewCount - a.reviewCount);
    }
    return list;
  }, [filtered, filters.sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilterCount =
    filters.categories.length +
    filters.brands.length +
    filters.colors.length +
    filters.sizes.length +
    (filters.inStockOnly ? 1 : 0) +
    (filters.minRating ? 1 : 0);

  const suggestionSections = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const recent = ["chocolate chip", "gift box", "stuffed cookies", "bestseller"];
    const trending = ["new flavors", "premium cookies", "party box"];
    const products = Array.from(
      new Set(
        catalog.map((p) => p.name).filter((v) =>
          q ? v.toLowerCase().includes(q) : true,
        ),
      ),
    ).slice(0, 4);
    const cats = Array.from(
      new Set(
        catalog.map((p) => p.category).filter((v) =>
          q ? v.toLowerCase().includes(q) : true,
        ),
      ),
    ).slice(0, 3);
    return [
      {
        id: "recent",
        title: t("search.suggestionRecent"),
        items: q ? recent.filter((i) => i.includes(q)) : recent.slice(0, 4),
      },
      {
        id: "trending",
        title: t("search.suggestionTrending"),
        items: q ? trending.filter((i) => i.includes(q)) : trending,
      },
      { id: "products", title: t("search.suggestionProducts"), items: products },
      { id: "categories", title: t("search.suggestionCategories"), items: cats },
    ].filter((s) => s.items.length > 0);
  }, [filters.query, catalog, t]);

  const flatSuggestions = useMemo(
    () => suggestionSections.flatMap((s) => s.items),
    [suggestionSections],
  );

  const applySuggestion = (value: string) => {
    setFilters({ query: value, page: 1 });
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
  };

  const filterPanel = useMemo(
    () => (
      <aside className="space-y-5 rounded-xl border border-cb-border bg-cb-surface p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">
            {t("search.category")}
          </p>
          <div className="mt-2 space-y-2">
            {categories.map((cat) => (
              <label key={cat} className="flex items-center gap-2 text-sm text-cb-text-strong">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(cat)}
                  onChange={(e) =>
                    setFilters({
                      categories: e.target.checked ? [cat] : [],
                      page: 1,
                    })
                  }
                />
                {cat}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">
            {t("search.brand")}
          </p>
          <div className="mt-2 max-h-32 space-y-2 overflow-auto">
            {brands.map((brand) => (
              <label key={brand} className="flex items-center gap-2 text-sm text-cb-text-strong">
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand)}
                  onChange={(e) =>
                    setFilters({
                      brands: e.target.checked
                        ? [...filters.brands, brand]
                        : filters.brands.filter((b) => b !== brand),
                      page: 1,
                    })
                  }
                />
                {brand}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">
            {t("search.price")}
          </p>
          <RangeSlider
            min={30}
            max={180}
            value={[filters.minPrice ?? 30, filters.maxPrice ?? 180]}
            onChange={([min, max]) => setFilters({ minPrice: min, maxPrice: max, page: 1 })}
          />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">
            {t("search.rating")}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[4, 3, 2].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() =>
                  setFilters({ minRating: filters.minRating === r ? null : r, page: 1 })
                }
                className={`rounded-md border px-2 py-1 text-xs ${
                  filters.minRating === r
                    ? "border-cb-terracotta-dark text-cb-terracotta-dark"
                    : "border-cb-border text-cb-text-muted"
                }`}
              >
                {r}★ {t("search.andUp")}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">
            {t("search.inStock")}
          </p>
          <label className="mt-2 flex items-center gap-2 text-sm text-cb-text-strong">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={(e) => setFilters({ inStockOnly: e.target.checked, page: 1 })}
            />
            {t("search.availableNow")}
          </label>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">
            {t("search.size")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() =>
                  setFilters({
                    sizes: filters.sizes.includes(size)
                      ? filters.sizes.filter((s) => s !== size)
                      : [...filters.sizes, size],
                    page: 1,
                  })
                }
                className={`rounded-md border px-2 py-1 text-xs ${
                  filters.sizes.includes(size)
                    ? "border-cb-terracotta-dark text-cb-terracotta-dark"
                    : "border-cb-border text-cb-text-muted"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">
            {t("search.color")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() =>
                  setFilters({
                    colors: filters.colors.includes(color)
                      ? filters.colors.filter((c) => c !== color)
                      : [...filters.colors, color],
                    page: 1,
                  })
                }
                className={`rounded-full border px-3 py-1 text-xs ${
                  filters.colors.includes(color)
                    ? "border-cb-terracotta-dark text-cb-terracotta-dark"
                    : "border-cb-border text-cb-text-muted"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={clearFilters}
          className="text-sm font-semibold text-cb-terracotta-dark hover:underline"
        >
          {t("search.clearAllFilters")}
        </button>
      </aside>
    ),
    [
      t,
      categories,
      brands,
      filters.categories,
      filters.brands,
      filters.minPrice,
      filters.maxPrice,
      filters.minRating,
      filters.inStockOnly,
      filters.sizes,
      filters.colors,
      availableSizes,
      availableColors,
      setFilters,
      clearFilters,
    ],
  );

  const sortOptions = useMemo(
    () => [
      { value: "popular" as const, label: t("search.sortPopular") },
      { value: "newest" as const, label: t("search.sortNewest") },
      { value: "price_asc" as const, label: t("search.sortPriceAsc") },
      { value: "price_desc" as const, label: t("search.sortPriceDesc") },
      { value: "rating" as const, label: t("search.sortTopRated") },
    ],
    [t],
  );

  const viewOptions = useMemo(
    () => [
      { value: "grid" as const, label: t("search.viewGrid") },
      { value: "list" as const, label: t("search.viewList") },
    ],
    [t],
  );

  return (
    <div className="bg-cb-cream pb-24 pt-8">
      <div className="mx-auto max-w-7xl cb-gutter">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-layout-heading text-2xl font-semibold text-cb-text-strong">
              {t("search.resultsFor", {
                q: filters.query || t("search.allLabel"),
              })}
            </h1>
            <p className="text-sm text-cb-text-muted">
              {t("search.itemsFound", { n: sorted.length })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-cb-border px-3 text-sm lg:hidden"
              onClick={() => setMobileFiltersOpen((v) => !v)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("search.filters")}
              {activeFilterCount ? (
                <span className="rounded-full bg-cb-terracotta-dark px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <Select
              value={filters.sort}
              options={sortOptions}
              onChange={(value) => setFilters({ sort: value as typeof filters.sort, page: 1 })}
            />
            <Select
              value={filters.view}
              options={viewOptions}
              onChange={(value) => setFilters({ view: value as "grid" | "list" })}
            />
          </div>
        </div>

        <div className="relative mb-6 max-w-xl">
          <Input
            variant="search"
            value={filters.query}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 120)}
            onKeyDown={(e) => {
              if (!flatSuggestions.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveSuggestionIndex((i) => Math.min(flatSuggestions.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveSuggestionIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && activeSuggestionIndex >= 0) {
                e.preventDefault();
                applySuggestion(flatSuggestions[activeSuggestionIndex]);
              } else if (e.key === "Escape") {
                setSuggestionsOpen(false);
              }
            }}
            onChange={(e) => {
              setFilters({ query: e.target.value, page: 1 });
              setSuggestionsOpen(true);
              setActiveSuggestionIndex(-1);
            }}
            placeholder={t("search.placeholder")}
          />
          {suggestionsOpen && flatSuggestions.length ? (
            <ul
              role="listbox"
              className="absolute z-30 mt-2 w-full rounded-lg border border-cb-border bg-cb-surface p-1 shadow-lg"
            >
              {(() => {
                let idx = -1;
                return suggestionSections.map((section) => (
                  <li key={section.id} className="p-1">
                    <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-cb-text-muted">
                      {section.title}
                    </p>
                    <ul>
                      {section.items.map((item) => {
                        idx += 1;
                        const current = idx;
                        return (
                          <li key={`${section.id}-${item}`}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={activeSuggestionIndex === current}
                              onClick={() => applySuggestion(item)}
                              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                                activeSuggestionIndex === current
                                  ? "bg-cb-hover-overlay text-cb-text-strong"
                                  : "text-cb-text-muted hover:bg-cb-hover-overlay"
                              }`}
                            >
                              {item}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ));
              })()}
            </ul>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="hidden lg:block">{filterPanel}</div>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {filters.categories.map((c) => (
                <Badge key={c} variant="outline">
                  {c}
                </Badge>
              ))}
              {filters.brands.map((b) => (
                <Badge key={b} variant="outline">
                  {b}
                </Badge>
              ))}
              {filters.inStockOnly ? (
                <Badge variant="success">{t("search.inStockBadge")}</Badge>
              ) : null}
            </div>
            {catalogError ? (
              <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
                {catalogError}
              </div>
            ) : loading || catalogLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} shape="card" />
                ))}
              </div>
            ) : pageItems.length === 0 ? (
              <div className="rounded-xl border border-cb-border bg-cb-surface p-12 text-center">
                <div className="mb-6 inline-flex rounded-full bg-cb-peach/30 p-4">
                  <SlidersHorizontal className="h-12 w-12 text-cb-terracotta-dark" />
                </div>
                <h3 className="font-serif text-2xl font-semibold text-cb-text-strong">
                  {t("search.noResults")}
                </h3>
                <p className="mt-3 text-cb-text-muted">{t("search.noResultsHint")}</p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={buttonClassName("outline", "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3")}
                  >
                    {t("search.clearAllFilters")}
                  </button>
                  <Link
                    href="/shop"
                    className={buttonClassName("primary", "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3")}
                  >
                    Browse All Cookies
                  </Link>
                </div>
              </div>
            ) : filters.view === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pageItems.map((product) => (
                  <SearchProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {pageItems.map((product) => (
                  <SearchProductRow key={product.id} product={product} />
                ))}
              </div>
            )}

            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(next) => setFilters({ page: next })}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileFiltersOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[88] lg:hidden"
          >
            <button
              type="button"
              className="absolute inset-0 bg-cb-scrim-strong/65"
              aria-label={t("search.closeFilters")}
              onClick={() => setMobileFiltersOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-2xl border-t border-cb-border bg-cb-surface p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-cb-text-strong">{t("search.filters")}</h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-sm font-semibold text-cb-terracotta-dark"
                >
                  {t("search.done")}
                </button>
              </div>
              {filterPanel}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

