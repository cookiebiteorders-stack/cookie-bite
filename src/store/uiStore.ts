"use client";

import { create } from "zustand";
import type { ToastMessage, ToastVariant } from "@/src/types/ui";

interface UiStore {
  toasts: ToastMessage[];
  pushToast: (payload: Omit<ToastMessage, "id" | "createdAt">) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiStore>((set, get) => ({
  toasts: [],
  pushToast: (payload) => {
    const toast: ToastMessage = {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    const next = [toast, ...get().toasts].slice(0, 3);
    set({ toasts: next });
  },
  removeToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export function createToastPayload(
  variant: ToastVariant,
  title: string,
  description?: string,
) {
  return { variant, title, description };
}

