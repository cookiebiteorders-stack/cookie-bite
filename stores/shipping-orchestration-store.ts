import { create } from "zustand";
import { fetchJson } from "@/lib/http/fetch-json";
import type { ShippingZoneRow } from "@/lib/shipping/types";
import { normalizeZone } from "@/lib/shipping/normalize-zone";
import type { CsvImportRow } from "@/lib/shipping/csv-zones";

type Toast = { id: string; message: string; variant: "success" | "error" };

export type CreateZonePayload = {
  name: string;
  cities: string[];
  base_fee_egp: number;
  free_shipping_threshold_egp: number | null;
  eta_min_days: number;
  eta_max_days: number;
  is_active: boolean;
  center_lat?: number | null;
  center_lng?: number | null;
  radius_km?: number | null;
  map_color?: string | null;
};

type ApiZoneResponse = { ok: true; zone: unknown };
type ApiListResponse = { zones: unknown[] };

function nextToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface ShippingOrchestrationState {
  zones: ShippingZoneRow[];
  loading: boolean;
  mutating: boolean;
  error: string | null;
  toasts: Toast[];
  /** مزامنة مع الخادم بعد التحميل */
  online: boolean;
  setOnline: (v: boolean) => void;
  pushToast: (message: string, variant?: "success" | "error") => void;
  removeToast: (id: string) => void;
  setZones: (zones: ShippingZoneRow[]) => void;
  loadZones: () => Promise<void>;
  createZone: (
    payload: CreateZonePayload,
    opts?: { silent?: boolean },
  ) => Promise<ShippingZoneRow | null>;
  updateZone: (id: string, patch: Partial<CreateZonePayload>) => Promise<ShippingZoneRow | null>;
  deleteZone: (id: string) => Promise<boolean>;
  reorderZones: (orderedIds: string[]) => Promise<boolean>;
  importRows: (rows: CsvImportRow[]) => Promise<number>;
}

export const useShippingOrchestrationStore = create<ShippingOrchestrationState>((set, get) => ({
  zones: [],
  loading: true,
  mutating: false,
  error: null,
  toasts: [],
  online: true,

  setOnline: (v) => set({ online: v }),

  pushToast: (message, variant = "success") => {
    const id = nextToastId();
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 5200);
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setZones: (zones) => set({ zones }),

  loadZones: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchJson<ApiListResponse>("/api/admin/shipping-zones", {
        cache: "no-store",
      });
      const zones = (data.zones ?? []).map(normalizeZone);
      set({ zones, loading: false, online: true });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load zones",
        online: false,
      });
    }
  },

  createZone: async (payload, opts) => {
    set({ mutating: true });
    try {
      const data = await fetchJson<ApiZoneResponse>("/api/admin/shipping-zones", {
        method: "POST",
        jsonBody: payload,
      });
      const zone = normalizeZone(data.zone);
      set((s) => ({
        zones: [...s.zones, zone],
        mutating: false,
        online: true,
      }));
      if (!opts?.silent) {
        get().pushToast(`Zone "${zone.name}" created`, "success");
      }
      return zone;
    } catch (e) {
      set({ mutating: false });
      if (!opts?.silent) {
        get().pushToast(e instanceof Error ? e.message : "Create failed", "error");
      }
      return null;
    }
  },

  updateZone: async (id, patch) => {
    set({ mutating: true });
    try {
      const data = await fetchJson<ApiZoneResponse>(`/api/admin/shipping-zones/${id}`, {
        method: "PATCH",
        jsonBody: patch,
      });
      const zone = normalizeZone(data.zone);
      set((s) => ({
        zones: s.zones.map((z) => (z.id === id ? zone : z)),
        mutating: false,
        online: true,
      }));
      get().pushToast("Zone updated", "success");
      return zone;
    } catch (e) {
      set({ mutating: false });
      get().pushToast(e instanceof Error ? e.message : "Update failed", "error");
      return null;
    }
  },

  deleteZone: async (id) => {
    set({ mutating: true });
    try {
      await fetchJson<{ ok: true }>(`/api/admin/shipping-zones/${id}`, { method: "DELETE" });
      set((s) => ({
        zones: s.zones.filter((z) => z.id !== id),
        mutating: false,
        online: true,
      }));
      get().pushToast("Zone deleted", "success");
      return true;
    } catch (e) {
      set({ mutating: false });
      get().pushToast(e instanceof Error ? e.message : "Delete failed", "error");
      return false;
    }
  },

  reorderZones: async (orderedIds) => {
    set({ mutating: true });
    try {
      await fetchJson<{ ok: true }>("/api/admin/shipping-zones/reorder", {
        method: "POST",
        jsonBody: { orderedIds },
      });
      set((s) => {
        const map = new Map(s.zones.map((z) => [z.id, z] as const));
        const next = orderedIds
          .map((id, i) => {
            const z = map.get(id);
            if (!z) return null;
            return { ...z, sort_order: i * 10 };
          })
          .filter(Boolean) as ShippingZoneRow[];
        const rest = s.zones.filter((z) => !orderedIds.includes(z.id));
        return { zones: [...next, ...rest], mutating: false, online: true };
      });
      get().pushToast("Priority order saved", "success");
      return true;
    } catch (e) {
      set({ mutating: false });
      get().pushToast(e instanceof Error ? e.message : "Reorder failed", "error");
      return false;
    }
  },

  importRows: async (rows) => {
    let ok = 0;
    let firstErr: string | null = null;
    for (const row of rows) {
      const created = await get().createZone(
        {
          name: row.name,
          cities: row.cities.length ? row.cities : ["—"],
          base_fee_egp: row.base_fee_egp,
          free_shipping_threshold_egp: row.free_shipping_threshold_egp,
          eta_min_days: row.eta_min_days,
          eta_max_days: row.eta_max_days,
          is_active: row.is_active,
        },
        { silent: true },
      );
      if (created) ok++;
      else if (!firstErr) firstErr = "Some rows failed (duplicate name or server error)";
    }
    await get().loadZones();
    if (firstErr && ok === 0) get().pushToast(firstErr, "error");
    else if (ok > 0) {
      get().pushToast(`Imported ${ok} zone(s)`, "success");
    }
    return ok;
  },
}));
