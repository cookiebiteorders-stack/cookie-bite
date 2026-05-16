"use client";

import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Copy, LifeBuoy, RefreshCw, ScrollText } from "lucide-react";
import type { FriendlyConsoleError } from "@/lib/payments/console-errors";
import { cn } from "@/lib/utils";

type PaymentsErrorPanelProps = {
  friendly: FriendlyConsoleError;
  technical?: string;
  onRetry: () => void;
  retrying: boolean;
  autoRetry: boolean;
  onToggleAutoRetry: () => void;
};

export function PaymentsErrorPanel({
  friendly,
  technical,
  onRetry,
  retrying,
  autoRetry,
  onToggleAutoRetry,
}: PaymentsErrorPanelProps) {
  const reduceMotion = useReducedMotion();
  const sev =
    friendly.severity === "critical"
      ? "Critical"
      : friendly.severity === "medium"
        ? "Medium"
        : "Low";

  return (
    <motion.div
      role="alert"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={
        reduceMotion
          ? { opacity: 1 }
          : { opacity: 1, x: [0, -3, 3, -2, 2, 0], transition: { duration: 0.45 } }
      }
      className={cn(
        "rounded-2xl border border-red-200/90 bg-red-50/95 p-5 shadow-md",
        "dark:border-red-900/60 dark:bg-red-950/40",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-100">
          <motion.div
            animate={reduceMotion ? undefined : { rotate: [0, -6, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          >
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </motion.div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-lg font-bold text-red-950 dark:text-red-50">
              {friendly.title}
            </h2>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-800 dark:bg-red-900/80 dark:text-red-100">
              {sev}
            </span>
            <span className="text-[11px] text-red-800/80 dark:text-red-200/80">
              {new Date().toLocaleString()}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-red-900/90 dark:text-red-100/90">
            {friendly.description}
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-red-900 dark:text-red-100">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-red-300"
              checked={autoRetry}
              onChange={onToggleAutoRetry}
            />
            Auto-retry every 25 seconds
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-800 disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} aria-hidden />
          Retry connection
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white/80 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-white dark:border-red-800 dark:bg-red-950/40 dark:text-red-50"
          onClick={() => {
            if (technical) void navigator.clipboard.writeText(technical);
          }}
        >
          <Copy className="h-4 w-4" aria-hidden />
          Copy diagnostics
        </button>
        <a
          href="mailto:support@example.com?subject=Payments%20Console%20error"
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white/80 px-4 py-2 text-sm font-semibold text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-50"
        >
          <LifeBuoy className="h-4 w-4" aria-hidden />
          Contact support
        </a>
        {process.env.NODE_ENV === "development" && technical && (
          <details className="w-full rounded-xl border border-red-200/80 bg-white/60 p-3 text-xs dark:border-red-900 dark:bg-red-950/30">
            <summary className="flex cursor-pointer items-center gap-1 font-bold text-red-900 dark:text-red-100">
              <ScrollText className="h-4 w-4" />
              Developer log (dev only)
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-red-900/90 dark:text-red-100/90">
              {technical}
            </pre>
          </details>
        )}
      </div>
    </motion.div>
  );
}
