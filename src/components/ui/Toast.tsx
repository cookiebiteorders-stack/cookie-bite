"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, ShoppingBag, XCircle } from "lucide-react";
import { useUiStore } from "@/src/store/uiStore";

const iconByVariant = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  cart: ShoppingBag,
} as const;

export function ToastViewport() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => removeToast(t.id), 3000),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [removeToast, toasts]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[110] flex w-[min(92vw,360px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = iconByVariant[toast.variant];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="pointer-events-auto rounded-lg border border-cb-border bg-cb-surface p-3 shadow-lg"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 text-cb-terracotta-dark" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cb-text-strong">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-0.5 text-xs text-cb-text-muted">{toast.description}</p>
                  ) : null}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

