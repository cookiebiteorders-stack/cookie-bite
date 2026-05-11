"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useShippingOrchestrationStore } from "@/stores/shipping-orchestration-store";
import { cn } from "@/lib/utils";

export function ShippingToasts() {
  const toasts = useShippingOrchestrationStore((s) => s.toasts);
  const removeToast = useShippingOrchestrationStore((s) => s.removeToast);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[80] flex max-w-sm flex-col gap-2 sm:right-6"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md",
              t.variant === "success"
                ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/90 dark:text-emerald-100"
                : "border-red-200/80 bg-red-50/95 text-red-900 dark:border-red-900/60 dark:bg-red-950/90 dark:text-red-100",
            )}
          >
            {t.variant === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
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
