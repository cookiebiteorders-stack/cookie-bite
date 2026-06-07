import { create } from "zustand";
import { fetchJson } from "@/lib/http/fetch-json";
import type {
  AdminProductRow,
  CatalogStats,
  ProductsListMeta,
  ProductsListResponse,
  StockStateFilter,
} from "@/lib/admin/products-dashboard-types";
import { filtersFromDashboardState } from "@/lib/admin/products-list-filters";
import {
  buildPatchFromPending,
  countPendingEdits,
  type InlineEditableField,
  type PendingEditsMap,
  type PriceAdjustMode,
  type SmartBulkRule,
} from "@/lib/admin/products-inline-edit";

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
  pendingEdits: PendingEditsMap;
  savingEdits: boolean;

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
  bulkApplyTags: (params: {
    tagIds: string[];
    mode: "add" | "remove" | "replace";
  }) => Promise<boolean>;

  setCellEdit: (id: string, field: InlineEditableField, value: string) => void;
  clearCellEdit: (id: string, field?: InlineEditableField) => void;
  discardPendingEdits: () => void;
  savePendingEdits: () => Promise<boolean>;
  pendingEditCount: () => number;

  applyBulkPriceAdjustment: (params: {
    mode: PriceAdjustMode;
    value: number;
    target: "selected" | "filtered";
  }) => Promise<boolean>;
  applySmartBulkRule: (rule: SmartBulkRule) => Promise<boolean>;
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
  pendingEdits: {},
  savingEdits: false,

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
        pendingEdits: {},
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

  setCellEdit: (id, field, value) =>
    set((s) => {
      const prev = s.pendingEdits[id] ?? {};
      const original = s.products.find((p) => p.id === id);
      if (!original) return s;

      let sameAsOriginal = false;
      if (field === "sku") sameAsOriginal = (value.trim() || "") === (original.sku ?? "");
      if (field === "category") sameAsOriginal = (value.trim() || "") === (original.category ?? "");
      if (field === "stock") sameAsOriginal = value.trim() === String(original.stock);
      if (field === "price_egp") sameAsOriginal = value.trim() === String(original.price_egp);

      const nextEdit = { ...prev };
      if (sameAsOriginal) delete nextEdit[field];
      else nextEdit[field] = value;

      const pendingEdits = { ...s.pendingEdits };
      if (Object.keys(nextEdit).length === 0) delete pendingEdits[id];
      else pendingEdits[id] = nextEdit;
      return { pendingEdits };
    }),

  clearCellEdit: (id, field) =>
    set((s) => {
      if (!field) {
        const pendingEdits = { ...s.pendingEdits };
        delete pendingEdits[id];
        return { pendingEdits };
      }
      const prev = s.pendingEdits[id];
      if (!prev) return s;
      const nextEdit = { ...prev };
      delete nextEdit[field];
      const pendingEdits = { ...s.pendingEdits };
      if (Object.keys(nextEdit).length === 0) delete pendingEdits[id];
      else pendingEdits[id] = nextEdit;
      return { pendingEdits };
    }),

  discardPendingEdits: () => set({ pendingEdits: {} }),

  pendingEditCount: () => countPendingEdits(get().pendingEdits),

  savePendingEdits: async () => {
    const pendingEdits = get().pendingEdits;
    const entries = Object.entries(pendingEdits);
    if (entries.length === 0) return true;

    const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];
    for (const [id, edit] of entries) {
      const built = buildPatchFromPending(edit);
      if ("error" in built) {
        get().pushToast(built.error, "error");
        return false;
      }
      updates.push({ id, patch: built.patch });
    }

    set({ savingEdits: true });
    try {
      const res = await fetchJson<{ ok: boolean; updated: number; failures: string[] }>(
        "/api/admin/products/batch-update",
        { method: "POST", jsonBody: { updates } },
      );
      if (res.failures?.length) {
        get().pushToast(`تم حفظ ${res.updated} — فشل ${res.failures.length}`, "info");
      } else {
        get().pushToast(`تم حفظ ${res.updated} منتج.`, "success");
      }
      set({ pendingEdits: {}, savingEdits: false });
      await get().loadProducts();
      return res.ok || res.updated > 0;
    } catch (e) {
      set({ savingEdits: false });
      get().pushToast(e instanceof Error ? e.message : "فشل حفظ التعديلات", "error");
      return false;
    }
  },

  applyBulkPriceAdjustment: async ({ mode, value, target }) => {
    if (target === "selected") {
      const selected = get().selectedIds;
      if (selected.size === 0) {
        get().pushToast("حدّد منتجات أولاً.", "info");
        return false;
      }
      const rows = get().products.filter((p) => selected.has(p.id));
      const updates = rows.map((row) => {
        const current = Number(row.price_egp);
        let next = current;
        if (mode === "set_fixed") next = value;
        else {
          const delta = (current * value) / 100;
          next = mode === "percent_add" ? current + delta : current - delta;
        }
        return {
          id: row.id,
          patch: { price_egp: Math.max(0.01, Math.round(next * 100) / 100) },
        };
      });
      try {
        await fetchJson("/api/admin/products/batch-update", {
          method: "POST",
          jsonBody: { updates },
        });
        get().pushToast(`تم تعديل أسعار ${updates.length} منتج.`, "success");
        await get().loadProducts();
        return true;
      } catch (e) {
        get().pushToast(e instanceof Error ? e.message : "فشل تعديل الأسعار", "error");
        return false;
      }
    }

    try {
      const res = await fetchJson<{ updated: number; matched: number }>(
        "/api/admin/products/bulk-by-filter",
        {
          method: "POST",
          jsonBody: {
            filters: filtersFromDashboardState(get()),
            price_adjustment: { mode, value },
          },
        },
      );
      get().pushToast(`تم تعديل ${res.updated} من ${res.matched} منتج (حسب الفلتر).`, "success");
      await get().loadProducts();
      return true;
    } catch (e) {
      get().pushToast(e instanceof Error ? e.message : "فشل تعديل الأسعار", "error");
      return false;
    }
  },

  applySmartBulkRule: async (rule) => {
    try {
      const filters = filtersFromDashboardState(get());
      const res = await fetchJson<{ updated: number; matched: number }>(
        "/api/admin/products/bulk-by-filter",
        {
          method: "POST",
          jsonBody: {
            filters,
            smart_rule:
              rule.type === "stock_below"
                ? { type: "stock_below", threshold: rule.threshold, action: rule.action }
                : { type: rule.type, action: rule.action },
          },
        },
      );
      get().pushToast(`تم تطبيق القاعدة على ${res.updated} من ${res.matched} منتج.`, "success");
      await get().loadProducts();
      return true;
    } catch (e) {
      get().pushToast(e instanceof Error ? e.message : "فشل تطبيق القاعدة", "error");
      return false;
    }
  },

  duplicateProduct: async (source) => {
    try {
      await fetchJson(`/api/admin/products/${source.id}/duplicate`, { method: "POST" });
      get().pushToast("تم تكرار المنتج (variants + tags + add-ons) كمسودة.", "success");
      await get().loadProducts();
      return true;
    } catch (e) {
      get().pushToast(e instanceof Error ? e.message : "فشل التكرار", "error");
      return false;
    }
  },

  bulkApplyTags: async ({ tagIds, mode }) => {
    const ids = Array.from(get().selectedIds);
    if (ids.length === 0) return false;
    try {
      const res = await fetchJson<{ affected: number; mode: string }>("/api/admin/products/bulk-tags", {
        method: "POST",
        jsonBody: { ids, tag_ids: tagIds, mode },
      });
      get().pushToast(`تم تطبيق الوسوم على ${res.affected} منتج.`, "success");
      await get().loadProducts();
      return true;
    } catch (e) {
      get().pushToast(e instanceof Error ? e.message : "فشل تطبيق الوسوم", "error");
      return false;
    }
  },
}));

