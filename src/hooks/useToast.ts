"use client";

import { createToastPayload, useUiStore } from "@/src/store/uiStore";

export function useToast() {
  const pushToast = useUiStore((s) => s.pushToast);
  const removeToast = useUiStore((s) => s.removeToast);

  return {
    pushToast,
    removeToast,
    success: (title: string, description?: string) =>
      pushToast(createToastPayload("success", title, description)),
    error: (title: string, description?: string) =>
      pushToast(createToastPayload("error", title, description)),
    info: (title: string, description?: string) =>
      pushToast(createToastPayload("info", title, description)),
    cart: (title: string, description?: string) =>
      pushToast(createToastPayload("cart", title, description)),
  };
}

