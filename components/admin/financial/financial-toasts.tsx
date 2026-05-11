"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useFinancialDashboardStore } from "@/stores/financial-dashboard-store";
import { cn } from "@/lib/utils";

export function FinancialToasts() {
  const toasts = useFinancialDashboardStore((s) => s.toasts);
  const removeToast = useFinancialDashboardStore((s) => s.removeToast);

  return (
    <div className="pointer-events-none fixed bottom-4 end-4 z-[80] flex max-w-sm flex-col gap-2 sm:end-6" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md",
              t.variant === "success" &&
                "border-emerald-200/80 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100",
              t.variant === "error" &&
                "border-red-200/80 bg-red-50/95 text-red-900 dark:border-red-900 dark:bg-red-950/90 dark:text-red-100",
              t.variant === "info" &&
                "border-sky-200/80 bg-sky-50/95 text-sky-950 dark:border-sky-900 dark:bg-sky-950/90 dark:text-sky-100",
            )}
          >
            {t.variant === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : t.variant === "error" ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="flex-1">{t.message}</span>
            <button type="button" className="text-xs opacity-70 hover:opacity-100" onClick={() => removeToast(t.id)}>
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
