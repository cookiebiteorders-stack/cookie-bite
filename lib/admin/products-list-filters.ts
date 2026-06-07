import { z } from "zod";
import { buildIlikeOrClause } from "@/lib/security/sanitize-filter";

export const productsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  search: z.string().optional(),
  low_stock: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
  category: z.string().max(120).optional(),
  price_min: z.coerce.number().nonnegative().optional(),
  price_max: z.coerce.number().nonnegative().optional(),
  stock_state: z.enum(["in_stock", "low", "out"]).optional(),
  discounted: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
});

export type ProductsListFilters = Omit<
  z.infer<typeof productsListQuerySchema>,
  "page" | "limit"
>;

export type ProductsListQuery = z.infer<typeof productsListQuerySchema>;

type FilterBuilder = {
  or: (clause: string) => FilterBuilder;
  lte: (column: string, value: number) => FilterBuilder;
  eq: (column: string, value: boolean | string) => FilterBuilder;
  ilike: (column: string, pattern: string) => FilterBuilder;
  gte: (column: string, value: number) => FilterBuilder;
  gt: (column: string, value: number) => FilterBuilder;
  not: (column: string, operator: string, value: null) => FilterBuilder;
  contains: (column: string, value: string[]) => FilterBuilder;
};

export function applyProductsListFilters<T extends FilterBuilder>(
  db: T,
  filters: ProductsListFilters,
): T {
  let next: FilterBuilder = db;
  const {
    search,
    low_stock,
    active,
    category,
    price_min,
    price_max,
    stock_state,
    discounted,
    featured,
  } = filters;

  if (search?.trim()) {
    const clause = buildIlikeOrClause(["slug", "name", "sku", "category"], search);
    if (clause) next = next.or(clause);
  }
  if (typeof low_stock === "boolean" && low_stock) next = next.lte("stock", 10);
  if (typeof active === "boolean") next = next.eq("is_active", active);
  if (category?.trim()) next = next.ilike("category", `%${category.trim()}%`);
  if (typeof price_min === "number") next = next.gte("price_egp", price_min);
  if (typeof price_max === "number") next = next.lte("price_egp", price_max);
  if (stock_state === "in_stock") next = next.gt("stock", 10);
  if (stock_state === "low") next = next.gt("stock", 0).lte("stock", 10);
  if (stock_state === "out") next = next.lte("stock", 0);
  if (typeof discounted === "boolean" && discounted) {
    next = next.not("compare_price_egp", "is", null);
  }
  if (typeof featured === "boolean" && featured) {
    next = next.contains("badges", ["featured"]);
  }
  return next as T;
}

export function filtersFromDashboardState(state: {
  search: string;
  lowStockOnly: boolean;
  activeOnly: "" | "true" | "false";
  category: string;
  priceMin: string;
  priceMax: string;
  stockState: "" | "in_stock" | "low" | "out";
  discountedOnly: boolean;
  featuredOnly: boolean;
}): ProductsListFilters {
  const filters: ProductsListFilters = {};
  if (state.search.trim()) filters.search = state.search.trim();
  if (state.lowStockOnly) filters.low_stock = true;
  if (state.activeOnly === "true") filters.active = true;
  if (state.activeOnly === "false") filters.active = false;
  if (state.category.trim()) filters.category = state.category.trim();
  const pMin = Number(state.priceMin);
  if (state.priceMin.trim() && Number.isFinite(pMin)) filters.price_min = pMin;
  const pMax = Number(state.priceMax);
  if (state.priceMax.trim() && Number.isFinite(pMax)) filters.price_max = pMax;
  if (state.stockState) filters.stock_state = state.stockState;
  if (state.discountedOnly) filters.discounted = true;
  if (state.featuredOnly) filters.featured = true;
  return filters;
}
