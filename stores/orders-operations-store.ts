import { create } from "zustand";
import { fetchJson } from "@/lib/http/fetch-json";
import type {
  AdminOrderRow,
  OrderDetailResponse,
  OrderStats,
  OrdersListMeta,
  OrdersListResponse,
} from "@/lib/admin/orders-operations-types";

type Toast = { id: string; message: string; variant: "success" | "error" | "info" };

function nextToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const defaultStats: OrderStats = {
  pending: 0,
  processing: 0,
  packed: 0,
  shipped: 0,
  delivered: 0,
  returned: 0,
  cancelled: 0,
  failed_payments: 0,
  revenue_today_egp: 0,
  orders_today: 0,
  orders_yesterday: 0,
};

export interface OrdersOperationsState {
  orders: AdminOrderRow[];
  total: number;
  page: number;
  limit: number;
  stats: OrderStats;
  meta: OrdersListMeta | null;
  loading: boolean;
  error: string | null;
  online: boolean;
  selectedIds: Set<string>;
  search: string;
  statusFilter: string;
  paymentFilter: string;
  dateFrom: string;
  dateTo: string;
  totalMin: string;
  totalMax: string;
  advancedFiltersOpen: boolean;
  toasts: Toast[];

  setOnline: (v: boolean) => void;
  setPage: (p: number) => void;
  setSearch: (s: string) => void;
  setStatusFilter: (s: string) => void;
  setPaymentFilter: (s: string) => void;
  setDateFrom: (s: string) => void;
  setDateTo: (s: string) => void;
  setTotalMin: (s: string) => void;
  setTotalMax: (s: string) => void;
  setAdvancedFiltersOpen: (v: boolean) => void;
  resetFilters: () => void;

  toggleSelect: (id: string) => void;
  selectAllOnPage: () => void;
  clearSelection: () => void;

  pushToast: (message: string, variant?: Toast["variant"]) => void;
  removeToast: (id: string) => void;

  loadOrders: () => Promise<void>;
  patchOrder: (id: string, body: Record<string, unknown>) => Promise<boolean>;
  bulkPatchOrders: (ids: string[], patch: Record<string, unknown>) => Promise<boolean>;
  fetchOrderDetail: (id: string) => Promise<OrderDetailResponse | null>;
}

function buildQuery(state: OrdersOperationsState): string {
  const params = new URLSearchParams({
    page: String(state.page),
    limit: String(state.limit),
  });
  if (state.search.trim()) params.set("search", state.search.trim());
  if (state.statusFilter) params.set("status", state.statusFilter);
  if (state.paymentFilter) params.set("payment_status", state.paymentFilter);
  if (state.dateFrom) params.set("date_from", state.dateFrom);
  if (state.dateTo) params.set("date_to", state.dateTo);
  const tMin = Number(state.totalMin);
  if (state.totalMin.trim() && Number.isFinite(tMin)) params.set("total_min", String(tMin));
  const tMax = Number(state.totalMax);
  if (state.totalMax.trim() && Number.isFinite(tMax)) params.set("total_max", String(tMax));
  return params.toString();
}

export const useOrdersOperationsStore = create<OrdersOperationsState>((set, get) => ({
  orders: [],
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
  statusFilter: "",
  paymentFilter: "",
  dateFrom: "",
  dateTo: "",
  totalMin: "",
  totalMax: "",
  advancedFiltersOpen: false,
  toasts: [],

  setOnline: (v) => set({ online: v }),
  setPage: (p) => set({ page: p, selectedIds: new Set() }),
  setSearch: (s) => set({ search: s, page: 1, selectedIds: new Set() }),
  setStatusFilter: (s) => set({ statusFilter: s, page: 1, selectedIds: new Set() }),
  setPaymentFilter: (s) => set({ paymentFilter: s, page: 1, selectedIds: new Set() }),
  setDateFrom: (s) => set({ dateFrom: s, page: 1, selectedIds: new Set() }),
  setDateTo: (s) => set({ dateTo: s, page: 1, selectedIds: new Set() }),
  setTotalMin: (s) => set({ totalMin: s, page: 1, selectedIds: new Set() }),
  setTotalMax: (s) => set({ totalMax: s, page: 1, selectedIds: new Set() }),
  setAdvancedFiltersOpen: (v) => set({ advancedFiltersOpen: v }),
  resetFilters: () =>
    set({
      search: "",
      statusFilter: "",
      paymentFilter: "",
      dateFrom: "",
      dateTo: "",
      totalMin: "",
      totalMax: "",
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
      selectedIds: new Set(s.orders.map((o) => o.id)),
    })),

  clearSelection: () => set({ selectedIds: new Set() }),

  pushToast: (message, variant = "success") => {
    const id = nextToastId();
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    setTimeout(() => get().removeToast(id), 5200);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  loadOrders: async () => {
    set({ loading: true, error: null });
    try {
      const qs = buildQuery(get());
      const data = await fetchJson<OrdersListResponse>(`/api/admin/orders?${qs}`, { cache: "no-store" });
      set({
        orders: data.orders ?? [],
        total: data.total ?? 0,
        stats: data.stats ?? defaultStats,
        meta: data.meta ?? null,
        loading: false,
        online: true,
        selectedIds: new Set(),
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "فشل تحميل الطلبات",
        orders: [],
        online: false,
        selectedIds: new Set(),
      });
    }
  },

  patchOrder: async (id, body) => {
    try {
      await fetchJson(`/api/admin/orders/${id}`, { method: "PATCH", jsonBody: body });
      get().pushToast("تم تحديث الطلب.", "success");
      await get().loadOrders();
      return true;
    } catch (e) {
      get().pushToast(e instanceof Error ? e.message : "فشل التحديث", "error");
      return false;
    }
  },

  bulkPatchOrders: async (ids, patch) => {
    if (ids.length === 0) return false;
    try {
      await Promise.all(
        ids.map((id) => fetchJson(`/api/admin/orders/${id}`, { method: "PATCH", jsonBody: patch })),
      );
      get().pushToast(`تم تحديث ${ids.length} طلب(ات).`, "success");
      await get().loadOrders();
      return true;
    } catch (e) {
      get().pushToast(e instanceof Error ? e.message : "فشل التحديث الجماعي", "error");
      return false;
    }
  },

  fetchOrderDetail: async (id) => {
    try {
      return await fetchJson<OrderDetailResponse>(`/api/admin/orders/${id}`, { cache: "no-store" });
    } catch {
      return null;
    }
  },
}));
