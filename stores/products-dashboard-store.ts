import { create } from "zustand";
import { fetchJson } from "@/lib/http/fetch-json";
import type {
  AdminProductRow,
  CatalogStats,
  ProductsListMeta,
  ProductsListResponse,
  StockStateFilter,
} from "@/lib/admin/products-dashboard-types";

type Toast = { id: string; message: string; variant: "success" | "error" | "info" };

function nextToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const defaultStats: CatalogStats = {
  total: 0,
  active: 0,
  draft: 0,
  out_of_stock: 0,
  low_stock: 0,
  revenue_estimate_egp: 0,
};

export interface ProductsDashboardState {
  products: AdminProductRow[];
  total: number;
  page: number;
  limit: number;
  stats: CatalogStats;
  meta: ProductsListMeta | null;
  loading: boolean;
  error: string | null;
  online: boolean;
  selectedIds: Set<string>;
  search: string;
  lowStockOnly: boolean;
  activeOnly: "" | "true" | "false";
  category: string;
  priceMin: string;
  priceMax: string;
  stockState: StockStateFilter;
  discountedOnly: boolean;
  featuredOnly: boolean;
  advancedFiltersOpen: boolean;
  toasts: Toast[];

  setOnline: (v: boolean) => void;
  setAdvancedFiltersOpen: (v: boolean) => void;
  setPage: (p: number) => void;
  setSearch: (s: string) => void;
  setLowStockOnly: (v: boolean) => void;
  setActiveOnly: (v: "" | "true" | "false") => void;
  setCategory: (v: string) => void;
  setPriceMin: (v: string) => void;
  setPriceMax: (v: string) => void;
  setStockState: (v: StockStateFilter) => void;
  setDiscountedOnly: (v: boolean) => void;
  setFeaturedOnly: (v: boolean) => void;
  resetFilters: () => void;

  toggleSelect: (id: string) => void;
  selectAllOnPage: () => void;
  clearSelection: () => void;

  pushToast: (message: string, variant?: Toast["variant"]) => void;
  removeToast: (id: string) => void;

  loadProducts: () => Promise<void>;
  bulkPatch: (patch: Record<string, unknown>) => Promise<boolean>;
  bulkDelete: (ids: string[]) => Promise<boolean>;
  createProduct: (body: Record<string, unknown>) => Promise<AdminProductRow | null>;
  duplicateProduct: (source: AdminProductRow) => Promise<boolean>;
}

function buildQuery(state: ProductsDashboardState): string {
  const params = new URLSearchParams({
    page: String(state.page),
    limit: String(state.limit),
  });
  if (state.search.trim()) params.set("search", state.search.trim());
  if (state.lowStockOnly) params.set("low_stock", "true");
  if (state.activeOnly) params.set("active", state.activeOnly);
  if (state.category.trim()) params.set("category", state.category.trim());
  const pMin = Number(state.priceMin);
  if (state.priceMin.trim() && Number.isFinite(pMin)) params.set("price_min", String(pMin));
  const pMax = Number(state.priceMax);
  if (state.priceMax.trim() && Number.isFinite(pMax)) params.set("price_max", String(pMax));
  if (state.stockState) params.set("stock_state", state.stockState);
  if (state.discountedOnly) params.set("discounted", "true");
  if (state.featuredOnly) params.set("featured", "true");
  return params.toString();
}

export const useProductsDashboardStore = create<ProductsDashboardState>((set, get) => ({
  products: [],
  total: 0,
  page: 1,
  limit: 20,
  stats: defaultStats,
  meta: null,
  loading: true,
  error: null,
  online: true,
  selectedIds: new Set(),
  search: "",
  lowStockOnly: false,
  activeOnly: "",
  category: "",
  priceMin: "",
  priceMax: "",
  stockState: "",
  discountedOnly: false,
  featuredOnly: false,
  advancedFiltersOpen: false,
  toasts: [],

  setAdvancedFiltersOpen: (v) => set({ advancedFiltersOpen: v }),

  setOnline: (v) => set({ online: v }),
  setPage: (p) => set({ page: p, selectedIds: new Set() }),
  setSearch: (s) => set({ search: s, page: 1, selectedIds: new Set() }),
  setLowStockOnly: (v) => set({ lowStockOnly: v, page: 1, selectedIds: new Set() }),
  setActiveOnly: (v) => set({ activeOnly: v, page: 1, selectedIds: new Set() }),
  setCategory: (v) => set({ category: v, page: 1, selectedIds: new Set() }),
  setPriceMin: (v) => set({ priceMin: v, page: 1, selectedIds: new Set() }),
  setPriceMax: (v) => set({ priceMax: v, page: 1, selectedIds: new Set() }),
  setStockState: (v) => set({ stockState: v, page: 1, selectedIds: new Set() }),
  setDiscountedOnly: (v) => set({ discountedOnly: v, page: 1, selectedIds: new Set() }),
  setFeaturedOnly: (v) => set({ featuredOnly: v, page: 1, selectedIds: new Set() }),
  resetFilters: () =>
    set({
      search: "",
      lowStockOnly: false,
      activeOnly: "",
      category: "",
      priceMin: "",
      priceMax: "",
      stockState: "",
      discountedOnly: false,
      featuredOnly: false,
      page: 1,
      selectedIds: new Set(),
    }),

  toggleSelect: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),

  selectAllOnPage: () =>
    set((s) => ({
      selectedIds: new Set(s.products.map((p) => p.id)),
    })),

  clearSelection: () => set({ selectedIds: new Set() }),

  pushToast: (message, variant = "success") => {
    const id = nextToastId();
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    setTimeout(() => get().removeToast(id), 5200);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  loadProducts: async () => {
    set({ loading: true, error: null });
    try {
      const qs = buildQuery(get());
      const data = await fetchJson<ProductsListResponse>(`/api/admin/products?${qs}`, {
        cache: "no-store",
      });
      set({
        products: data.products ?? [],
        total: data.total ?? 0,
        stats: data.stats ?? defaultStats,
        meta: data.meta ?? null,
        loading: false,
        online: true,
        selectedIds: new Set(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل تحميل المنتجات";
      set({
        loading: false,
        error: msg,
        products: [],
        online: false,
        selectedIds: new Set(),
      });
    }
  },

  bulkPatch: async (patch) => {
    const ids = Array.from(get().selectedIds);
    if (ids.length === 0) return false;
    try {
      await fetchJson("/api/admin/products", {
        method: "PATCH",
        jsonBody: { ids, patch },
      });
      get().pushToast("تم تحديث المنتجات المحددة.", "success");
      await get().loadProducts();
      return true;
    } catch (e) {
      get().pushToast(e instanceof Error ? e.message : "فشل التحديث الجماعي", "error");
      return false;
    }
  },

  bulkDelete: async (ids) => {
    if (ids.length === 0) return false;
    try {
      await fetchJson("/api/admin/products", {
        method: "DELETE",
        jsonBody: { ids },
      });
      get().pushToast("تم حذف المنتجات.", "success");
      await get().loadProducts();
      return true;
    } catch (e) {
      get().pushToast(e instanceof Error ? e.message : "فشل الحذف", "error");
      return false;
    }
  },

  createProduct: async (body) => {
    try {
      const res = await fetchJson<{ ok: boolean; product: AdminProductRow }>("/api/admin/products", {
        method: "POST",
        jsonBody: body,
      });
      get().pushToast("تم إنشاء المنتج.", "success");
      await get().loadProducts();
      return res.product ?? null;
    } catch (e) {
      get().pushToast(e instanceof Error ? e.message : "فشل الإنشاء", "error");
      return null;
    }
  },

  duplicateProduct: async (source) => {
    const name = `Copy of ${source.name}`.slice(0, 160);
    const ingredientsList = (source.dietary ?? []).filter(Boolean);
    const body = {
      name,
      title_en: source.title_en ? `Copy — ${source.title_en}`.slice(0, 160) : null,
      title_ar: source.title_ar ? `نسخة — ${source.title_ar}`.slice(0, 160) : null,
      description_en: source.description_en ?? null,
      description_ar: source.description_ar ?? null,
      category: source.category ?? null,
      sku: null,
      price_egp: source.price_egp,
      stock: Math.max(0, source.stock),
      is_active: false,
      image_url: source.image_url ?? null,
      dietary: ingredientsList,
      compare_price_egp: source.compare_price_egp ?? null,
    };
    try {
      await fetchJson("/api/admin/products", { method: "POST", jsonBody: body });
      get().pushToast("تم تكرار المنتج كمسودة غير منشورة.", "success");
      await get().loadProducts();
      return true;
    } catch (e) {
      get().pushToast(e instanceof Error ? e.message : "فشل التكرار", "error");
      return false;
    }
  },
}));

