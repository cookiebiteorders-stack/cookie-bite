"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { usePaymentsConsoleStore } from "@/stores/payments-console-store";
import { cn } from "@/lib/utils";

export function PaymentsToasts() {
  const toasts = usePaymentsConsoleStore((s) => s.toasts);
  const removeToast = usePaymentsConsoleStore((s) => s.removeToast);

  return (
    <div
      className="pointer-events-none fixed bottom-4 end-4 z-[80] flex max-w-sm flex-col gap-2 sm:end-6"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md",
              t.variant === "success" &&
                "border-emerald-200/80 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/90 dark:text-emerald-100",
              t.variant === "error" &&
                "border-red-200/80 bg-red-50/95 text-red-900 dark:border-red-900/60 dark:bg-red-950/90 dark:text-red-100",
              t.variant === "info" &&
                "border-sky-200/80 bg-sky-50/95 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/90 dark:text-sky-100",
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
              className="rounded-lg px-1 text-xs opacity-70 hover:opacity-100"
              onClick={() => removeToast(t.id)}
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
