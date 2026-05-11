import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchJson } from "@/lib/http/fetch-json";
import type { PaymentSummaryResponse } from "@/lib/payments/payment-summary-types";
import { parseConsoleError, type FriendlyConsoleError } from "@/lib/payments/console-errors";

type Toast = { id: string; message: string; variant: "success" | "error" | "info" };

function toastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type PaymentsConsoleState = {
  summary: PaymentSummaryResponse | null;
  loading: boolean;
  errorRaw: string | null;
  friendlyError: FriendlyConsoleError | null;
  operational: boolean;
  autoRetry: boolean;
  liveMode: boolean;
  toasts: Toast[];
  lastFetchedAt: string | null;
  pushToast: (message: string, variant?: Toast["variant"]) => void;
  removeToast: (id: string) => void;
  setAutoRetry: (v: boolean) => void;
  setLiveMode: (v: boolean) => void;
  loadSummary: () => Promise<void>;
};

export const usePaymentsConsoleStore = create<PaymentsConsoleState>()(
  persist(
    (set, get) => ({
      summary: null,
      loading: true,
      errorRaw: null,
      friendlyError: null,
      operational: true,
      autoRetry: true,
      liveMode: true,
      toasts: [],
      lastFetchedAt: null,

      pushToast: (message, variant = "info") => {
        const id = toastId();
        set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
        setTimeout(() => get().removeToast(id), 4800);
      },

      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setAutoRetry: (v) => set({ autoRetry: v }),
      setLiveMode: (v) => set({ liveMode: v }),

      loadSummary: async () => {
        set({ loading: true, errorRaw: null, friendlyError: null });
        try {
          const data = await fetchJson<PaymentSummaryResponse>("/api/admin/payments/summary", {
            cache: "no-store",
          });
          set({
            summary: data,
            loading: false,
            operational: true,
            lastFetchedAt: data.meta.fetched_at,
          });
        } catch (e) {
          const raw = e instanceof Error ? e.message : "Unknown error";
          set({
            loading: false,
            errorRaw: raw,
            friendlyError: parseConsoleError(raw),
            operational: false,
            summary: null,
          });
        }
      },
    }),
    {
      name: "cb-payments-console",
      partialize: (s) => ({ autoRetry: s.autoRetry, liveMode: s.liveMode }),
    },
  ),
);
