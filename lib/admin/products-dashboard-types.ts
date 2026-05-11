export type AdminProductRow = {
  id: string;
  name: string;
  slug?: string | null;
  title_en: string | null;
  title_ar?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  dietary?: string[] | null;
  badges?: string[] | null;
  category?: string | null;
  sku: string | null;
  stock: number;
  price_egp: number;
  compare_price_egp?: number | null;
  is_active: boolean;
  image_url?: string | null;
  images?: unknown;
  updated_at?: string | null;
};

export type CatalogStats = {
  total: number;
  active: number;
  draft: number;
  out_of_stock: number;
  low_stock: number;
  revenue_estimate_egp: number;
};

export type ProductsListMeta = {
  role?: string;
  permission?: "full" | "limited" | "view" | "none";
  can_write?: boolean;
  can_delete?: boolean;
};

export type ProductsListResponse = {
  products: AdminProductRow[];
  total: number;
  page: number;
  limit: number;
  stats: CatalogStats;
  meta?: ProductsListMeta;
};

export type StockStateFilter = "" | "in_stock" | "low" | "out";

export type ProductFormState = {
  name: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  ingredients: string;
  category: string;
  sku: string;
  price_egp: string;
  compare_price_egp: string;
  stock: string;
  low_stock_threshold: string;
  image_url: string;
  is_active: boolean;
  meta_title: string;
  meta_description: string;
};

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: "",
  title_en: "",
  title_ar: "",
  description_en: "",
  description_ar: "",
  ingredients: "",
  category: "",
  sku: "",
  price_egp: "",
  compare_price_egp: "",
  stock: "0",
  low_stock_threshold: "10",
  image_url: "",
  is_active: true,
  meta_title: "",
  meta_description: "",
};
