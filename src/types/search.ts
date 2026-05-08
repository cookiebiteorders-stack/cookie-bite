export interface SearchFilters {
  query: string;
  categories: string[];
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  inStockOnly: boolean;
  colors: string[];
  sizes: string[];
  sort: "popular" | "newest" | "price_asc" | "price_desc" | "rating";
  page: number;
  view: "grid" | "list";
}

