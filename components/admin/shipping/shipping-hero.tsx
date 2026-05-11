"use client";

import { motion, useReducedMotion } from "motion/react";
import { Package, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ShippingHeroProps = {
  online: boolean;
};

export function ShippingHero({ online }: ShippingHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-cb-border/80",
        "bg-gradient-to-br from-cb-cream-2/90 via-cb-surface-elevated to-cb-peach/25",
        "p-6 shadow-[var(--shadow-editorial)] backdrop-blur-xl sm:p-8",
        "dark:from-cb-surface-2 dark:via-cb-surface-elevated dark:to-cb-terracotta-dark/20",
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cb-mint/25 blur-3xl transition-opacity duration-500 group-hover:opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-cb-terracotta-dark/15 blur-2xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <motion.div
            whileHover={reduceMotion ? undefined : { scale: 1.06, rotate: [-2, 2, 0] }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cb-border bg-cb-surface/80 text-cb-terracotta-dark shadow-sm"
          >
            <Package className="h-7 w-7" aria-hidden />
          </motion.div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-bold tracking-tight text-cb-text-strong sm:text-3xl">
                Shipping Orchestration
              </h1>
              <Sparkles className="h-4 w-4 text-amber-500 opacity-80" aria-hidden />
            </div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-cb-text sm:text-base">
              Manage delivery zones, fees, SLA ranges, and priority — with live validation and
              enterprise-grade controls.
            </p>
          </div>
        </div>

        <div
          className={cn(
            "inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
            online
              ? "border-emerald-300/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
              : "border-amber-300/80 bg-amber-50/90 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              online ? "animate-pulse bg-emerald-500" : "bg-amber-500",
            )}
            aria-hidden
          />
          {online ? "System active" : "Check connection"}
        </div>
      </div>
    </motion.header>
  );
}
