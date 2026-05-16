"use client";

import { motion, useReducedMotion } from "motion/react";
import { AlertCircle, Copy, RefreshCw } from "lucide-react";
import type { FriendlyFinancialError } from "@/lib/financial/financial-errors";
import { cn } from "@/lib/utils";

type Props = {
  friendly: FriendlyFinancialError;
  technical?: string;
  onRetry: () => void;
  retrying: boolean;
  autoRetry: boolean;
  onToggleAutoRetry: () => void;
};

export function FinancialErrorPanel({
  friendly,
  technical,
  onRetry,
  retrying,
  autoRetry,
  onToggleAutoRetry,
}: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      role="alert"
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={
        reduceMotion
          ? { opacity: 1 }
          : { opacity: 1, x: [0, -2, 2, -1, 1, 0], transition: { duration: 0.4 } }
      }
      className="rounded-2xl border border-red-200/90 bg-red-50/95 p-5 shadow-md dark:border-red-900/50 dark:bg-red-950/35"
    >
      <div className="flex gap-3">
        <motion.div
          animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-100"
        >
          <AlertCircle className="h-6 w-6" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg font-bold text-red-950 dark:text-red-50">{friendly.title}</h2>
          <p className="mt-1 text-sm text-red-900/90 dark:text-red-100/90">{friendly.description}</p>
          <p className="mt-2 text-[11px] text-red-800/70 dark:text-red-200/70">
            {new Date().toLocaleString()}
          </p>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-red-900 dark:text-red-100">
            <input type="checkbox" className="h-4 w-4 rounded" checked={autoRetry} onChange={onToggleAutoRetry} />
            Auto-retry every 5 seconds
          </label>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={retrying}
          onClick={onRetry}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50",
          )}
        >
          <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} />
          Retry
        </button>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="rounded-xl border border-red-200 bg-white/90 px-4 py-2 text-sm font-semibold text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-50"
        >
          Reload data
        </button>
        {technical && (
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(technical)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white/90 px-4 py-2 text-sm font-semibold text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-50"
          >
            <Copy className="h-4 w-4" />
            Copy logs
          </button>
        )}
        {process.env.NODE_ENV === "development" && technical && (
          <details className="w-full rounded-xl border border-red-200/80 bg-white/70 p-3 text-xs dark:border-red-900 dark:bg-red-950/30">
            <summary className="cursor-pointer font-bold">Admin debug</summary>
            <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap break-all">{technical}</pre>
          </details>
        )}
      </div>
    </motion.div>
  );
}
