import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchJson } from "@/lib/http/fetch-json";
import type { FinancialPreset, FinancialSummaryResponse } from "@/lib/financial/types";
import {
  parseFinancialError,
  type FriendlyFinancialError,
} from "@/lib/financial/financial-errors";

type Toast = { id: string; message: string; variant: "success" | "error" | "info" };

function tid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type FinancialDashboardState = {
  summary: FinancialSummaryResponse | null;
  loading: boolean;
  errorRaw: string | null;
  friendlyError: FriendlyFinancialError | null;
  preset: FinancialPreset;
  customFrom: string;
  customTo: string;
  compareMode: boolean;
  autoRetry: boolean;
  budgetMonthlyEgp: number;
  showUsd: boolean;
  toasts: Toast[];
  pushToast: (m: string, v?: Toast["variant"]) => void;
  removeToast: (id: string) => void;
  setPreset: (p: FinancialPreset) => void;
  setCustomRange: (from: string, to: string) => void;
  setCompareMode: (v: boolean) => void;
  setAutoRetry: (v: boolean) => void;
  setBudget: (n: number) => void;
  setShowUsd: (v: boolean) => void;
  loadSummary: () => Promise<void>;
};

export const useFinancialDashboardStore = create<FinancialDashboardState>()(
  persist(
    (set, get) => ({
      summary: null,
      loading: true,
      errorRaw: null,
      friendlyError: null,
      preset: "month",
      customFrom: "",
      customTo: "",
      compareMode: false,
      autoRetry: true,
      budgetMonthlyEgp: 50_000,
      showUsd: false,
      toasts: [],

      pushToast: (message, variant = "info") => {
        const id = tid();
        set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
        setTimeout(() => get().removeToast(id), 4500);
      },

      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setPreset: (preset) => set({ preset }),
      setCustomRange: (customFrom, customTo) => set({ customFrom, customTo }),
      setCompareMode: (compareMode) => set({ compareMode }),
      setAutoRetry: (autoRetry) => set({ autoRetry }),
      setBudget: (budgetMonthlyEgp) => set({ budgetMonthlyEgp }),
      setShowUsd: (showUsd) => set({ showUsd }),

      loadSummary: async () => {
        set({ loading: true, errorRaw: null, friendlyError: null });
        const { preset, customFrom, customTo, compareMode } = get();
        const qs = new URLSearchParams();
        const effPreset =
          preset === "custom" && (!customFrom || !customTo) ? "month" : preset;
        qs.set("preset", effPreset);
        if (effPreset === "custom") {
          if (customFrom) qs.set("from", customFrom);
          if (customTo) qs.set("to", customTo);
        }
        if (compareMode) qs.set("compare", "1");
        try {
          const data = await fetchJson<FinancialSummaryResponse>(
            `/api/admin/financial/summary?${qs.toString()}`,
            { cache: "no-store" },
          );
          set({ summary: data, loading: false });
        } catch (e) {
          const raw = e instanceof Error ? e.message : "Unknown error";
          set({
            loading: false,
            errorRaw: raw,
            friendlyError: parseFinancialError(raw),
            summary: null,
          });
        }
      },
    }),
    {
      name: "cb-financial-dashboard",
      partialize: (s) => ({
        autoRetry: s.autoRetry,
        compareMode: s.compareMode,
        budgetMonthlyEgp: s.budgetMonthlyEgp,
        preset: s.preset,
      }),
    },
  ),
);
