"use client";

import { motion, useReducedMotion } from "motion/react";
import { CreditCard, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentsHeroProps = {
  operational: boolean;
  liveMode: boolean;
  lastFetchedAt: string | null;
  onToggleLive: () => void;
};

export function PaymentsHero({
  operational,
  liveMode,
  lastFetchedAt,
  onToggleLive,
}: PaymentsHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className={cn(
        "admin-hero-surface rounded-2xl p-6 shadow-[var(--shadow-editorial)] sm:p-8",
        "backdrop-blur-xl",
      )}
    >
      <div className="admin-panel-scrim" aria-hidden />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cb-border bg-cb-surface/90 text-cb-terracotta-dark shadow-sm">
            <CreditCard className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-cb-text-strong sm:text-3xl">
              Payments Console
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cb-text sm:text-base">
              Gateway transaction health, status distribution, and captured value — with safe
              error handling and live refresh.
            </p>
            {lastFetchedAt && (
              <p className="mt-2 text-xs text-cb-text-muted">
                Last sync: {new Date(lastFetchedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onToggleLive}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
              liveMode
                ? "border-emerald-300/80 bg-emerald-50/90 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                : "border-amber-300/80 bg-amber-50/90 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100",
            )}
          >
            <Radio className="h-3.5 w-3.5" aria-hidden />
            {liveMode ? "Live view" : "Test mode (UI)"}
          </button>
          <div
            className={cn(
              "inline-flex items-center gap-2 self-start rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wide",
              operational
                ? "border-emerald-300/80 bg-emerald-50/90 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                : "border-red-300/80 bg-red-50/90 text-red-900 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-100",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                operational ? "animate-pulse bg-emerald-500" : "bg-red-500",
              )}
            />
            {operational ? "All systems operational" : "Issues detected"}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
