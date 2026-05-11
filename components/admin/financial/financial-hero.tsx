"use client";

import { motion, useReducedMotion } from "motion/react";
import { BarChart3, Moon, RefreshCw, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { FinancialPreset } from "@/lib/financial/types";
import { cn } from "@/lib/utils";

type Props = {
  preset: FinancialPreset;
  onPreset: (p: FinancialPreset) => void;
  customFrom: string;
  customTo: string;
  onCustomChange: (from: string, to: string) => void;
  onRefresh: () => void;
  loading: boolean;
  compareMode: boolean;
  onCompare: (v: boolean) => void;
};

const presets: { id: FinancialPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "custom", label: "Custom" },
];

export function FinancialHero({
  preset,
  onPreset,
  customFrom,
  customTo,
  onCustomChange,
  onRefresh,
  loading,
  compareMode,
  onCompare,
}: Props) {
  const reduceMotion = useReducedMotion();
  const { theme, setTheme } = useTheme();

  return (
    <motion.header
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-cb-border/80 p-6 shadow-[var(--shadow-editorial)] sm:p-8",
        "bg-gradient-to-br from-cb-cream-2/95 via-cb-surface-elevated to-cb-peach/20 backdrop-blur-xl",
        "dark:from-cb-surface-2 dark:via-cb-surface-elevated dark:to-cb-terracotta-dark/15",
      )}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cb-mint/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cb-border bg-cb-surface/90 text-cb-terracotta-dark shadow-sm">
            <BarChart3 className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-cb-text-strong sm:text-3xl">Financial Reports</h1>
            <p className="mt-2 max-w-2xl text-sm text-cb-text sm:text-base">
              Revenue, expenses, and net performance insights — with charts, ledger, and comparison mode.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live data
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex items-center gap-2 rounded-full border border-cb-border bg-cb-surface px-3 py-2 text-xs font-bold"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            Theme
          </button>
          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-cb-terracotta-dark px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="relative mt-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPreset(p.id)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide",
                preset === p.id
                  ? "bg-cb-terracotta-dark text-white shadow-md"
                  : "border border-cb-border bg-cb-surface text-cb-text hover:bg-cb-hover-overlay",
              )}
            >
              {p.label}
            </button>
          ))}
          <label className="ms-auto flex cursor-pointer items-center gap-2 text-xs font-bold text-cb-text-strong">
            <input type="checkbox" className="h-4 w-4 rounded" checked={compareMode} onChange={(e) => onCompare(e.target.checked)} />
            Compare prev.
          </label>
        </div>

        {preset === "custom" && (
          <div className="flex flex-wrap gap-3">
            <label className="text-xs font-bold uppercase text-cb-text-muted">
              From
              <input
                type="date"
                value={customFrom}
                onChange={(e) => onCustomChange(e.target.value, customTo)}
                className="mt-1 block rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold uppercase text-cb-text-muted">
              To
              <input
                type="date"
                value={customTo}
                onChange={(e) => onCustomChange(customFrom, e.target.value)}
                className="mt-1 block rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}
      </div>
    </motion.header>
  );
}
