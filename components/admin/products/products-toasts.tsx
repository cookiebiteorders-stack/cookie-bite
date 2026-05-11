"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useProductsDashboardStore } from "@/stores/products-dashboard-store";
import { cn } from "@/lib/utils";

export function ProductsToasts() {
  const toasts = useProductsDashboardStore((s) => s.toasts);
  const removeToast = useProductsDashboardStore((s) => s.removeToast);

  return (
    <div
      className="pointer-events-none fixed bottom-4 end-4 z-[90] flex max-w-sm flex-col gap-2 sm:end-6"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md",
              t.variant === "success" &&
                "border-amber-200/90 bg-amber-50/95 text-amber-950 dark:border-amber-800 dark:bg-amber-950/85 dark:text-amber-50",
              t.variant === "error" &&
                "border-red-200/80 bg-red-50/95 text-red-900 dark:border-red-900 dark:bg-red-950/90 dark:text-red-100",
              t.variant === "info" &&
                "border-sky-200/80 bg-sky-50/95 text-sky-950 dark:border-sky-900 dark:bg-sky-950/90 dark:text-sky-100",
            )}
          >
            {t.variant === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            ) : t.variant === "error" ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            )}
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              className="rounded-md px-1 text-xs opacity-70 hover:opacity-100 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400"
              onClick={() => removeToast(t.id)}
            >
              إغلاق
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
