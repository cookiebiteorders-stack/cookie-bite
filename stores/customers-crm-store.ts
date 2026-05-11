import { create } from "zustand";
import { fetchJson } from "@/lib/http/fetch-json";
import type {
  AdminCustomerRow,
  CustomerDetailResponse,
  CustomerStats,
  CustomersListMeta,
  CustomersListResponse,
  CustomerSegments,
} from "@/lib/admin/crm-types";

type Toast = { id: string; message: string; variant: "success" | "error" | "info" };

function nextToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const defaultStats: CustomerStats = {
  total_customers: 0,
  new_signups_30d: 0,
  returning_with_orders: 0,
  vip_gold_plus: 0,
  loyalty_members: 0,
  at_risk_proxy: 0,
  avg_ltv_sample_egp: 0,
  active_last_90d: 0,
};

const defaultSegments: CustomerSegments = {
  new_customers: 0,
  returning: 0,
  vip: 0,
  at_risk: 0,
};

export interface CustomersCrmState {
  customers: AdminCustomerRow[];
  total: number;
  page: number;
  limit: number;
  stats: CustomerStats;
  segments: CustomerSegments;
  meta: CustomersListMeta | null;
  loading: boolean;
  error: string | null;
  online: boolean;
  search: string;
  tierFilter: "" | "bronze" | "silver" | "gold" | "platinum";
  segmentFilter: "" | "all" | "vip" | "new" | "inactive" | "frequent";
  pointsMin: string;
  pointsMax: string;
  advancedFiltersOpen: boolean;
  toasts: Toast[];

  setPage: (p: number) => void;
  setSearch: (s: string) => void;
  setTierFilter: (t: CustomersCrmState["tierFilter"]) => void;
  setSegmentFilter: (s: CustomersCrmState["segmentFilter"]) => void;
  setPointsMin: (s: string) => void;
  setPointsMax: (s: string) => void;
  setAdvancedFiltersOpen: (v: boolean) => void;
  resetFilters: () => void;
  setOnline: (v: boolean) => void;

  pushToast: (message: string, variant?: Toast["variant"]) => void;
  removeToast: (id: string) => void;

  loadCustomers: () => Promise<void>;
  fetchCustomerDetail: (id: string) => Promise<CustomerDetailResponse | null>;
  patchCustomer: (id: string, body: Record<string, unknown>) => Promise<boolean>;
}

function buildQuery(state: CustomersCrmState): string {
  const params = new URLSearchParams({
    page: String(state.page),
    limit: String(state.limit),
  });
  if (state.search.trim()) params.set("search", state.search.trim());
  if (state.tierFilter) params.set("tier", state.tierFilter);
  if (state.segmentFilter && state.segmentFilter !== "all") params.set("segment", state.segmentFilter);
  const pMin = Number(state.pointsMin);
  if (state.pointsMin.trim() && Number.isFinite(pMin)) params.set("points_min", String(Math.floor(pMin)));
  const pMax = Number(state.pointsMax);
  if (state.pointsMax.trim() && Number.isFinite(pMax)) params.set("points_max", String(Math.floor(pMax)));
  return params.toString();
}

export const useCustomersCrmStore = create<CustomersCrmState>((set, get) => ({
  customers: [],
  total: 0,
  page: 1,
  limit: 20,
  stats: defaultStats,
  segments: defaultSegments,
  meta: null,
  loading: true,
  error: null,
  online: true,
  search: "",
  tierFilter: "",
  segmentFilter: "",
  pointsMin: "",
  pointsMax: "",
  advancedFiltersOpen: false,
  toasts: [],

  setPage: (p) => set({ page: p }),
  setSearch: (s) => set({ search: s, page: 1 }),
  setTierFilter: (t) => set({ tierFilter: t, page: 1 }),
  setSegmentFilter: (s) => set({ segmentFilter: s, page: 1 }),
  setPointsMin: (s) => set({ pointsMin: s, page: 1 }),
  setPointsMax: (s) => set({ pointsMax: s, page: 1 }),
  setAdvancedFiltersOpen: (v) => set({ advancedFiltersOpen: v }),
  resetFilters: () =>
    set({
      search: "",
      tierFilter: "",
      segmentFilter: "",
      pointsMin: "",
      pointsMax: "",
      page: 1,
    }),
  setOnline: (v) => set({ online: v }),

  pushToast: (message, variant = "success") => {
    const id = nextToastId();
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    setTimeout(() => get().removeToast(id), 5200);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  loadCustomers: async () => {
    set({ loading: true, error: null });
    try {
      const qs = buildQuery(get());
      const data = await fetchJson<CustomersListResponse>(`/api/admin/customers?${qs}`, { cache: "no-store" });
      set({
        customers: data.customers ?? [],
        total: data.total ?? 0,
        stats: data.stats ?? defaultStats,
        segments: data.segments ?? defaultSegments,
        meta: data.meta ?? null,
        loading: false,
        online: true,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "فشل تحميل العملاء",
        customers: [],
        online: false,
      });
    }
  },

  fetchCustomerDetail: async (id) => {
    try {
      return await fetchJson<CustomerDetailResponse>(`/api/admin/customers/${id}`, { cache: "no-store" });
    } catch {
      return null;
    }
  },

  patchCustomer: async (id, body) => {
    try {
      await fetchJson(`/api/admin/customers/${id}`, { method: "PATCH", jsonBody: body });
      get().pushToast("تم حفظ بيانات العميل.", "success");
      await get().loadCustomers();
      return true;
    } catch (e) {
      get().pushToast(e instanceof Error ? e.message : "فشل الحفظ", "error");
      return false;
    }
  },
}));
