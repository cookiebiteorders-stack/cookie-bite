"use client";

import { motion, useReducedMotion } from "motion/react";
import { Gauge, Timer, Wifi } from "lucide-react";
import type { GatewayHealthCard } from "@/lib/payments/payment-summary-types";
import { cn } from "@/lib/utils";

type Props = {
  gateways: GatewayHealthCard[];
};

function dotClass(s: GatewayHealthCard["status"]) {
  if (s === "healthy") return "bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,0.25)]";
  if (s === "degraded") return "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.25)] animate-pulse";
  return "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.35)] animate-pulse";
}

export function PaymentsGatewayMonitor({ gateways }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-serif text-xl font-bold text-cb-text-strong">Gateway health</h2>
        <p className="text-sm text-cb-text-muted">
          Derived from your orders — synthetic latency/uptime heuristics for quick triage.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {gateways.map((g, i) => (
          <motion.div
            key={g.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm",
              g.status === "down" && "border-red-200/90 dark:border-red-900/60",
              g.status === "degraded" && "border-amber-200/90 dark:border-amber-900/50",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-cb-text-strong">{g.label}</p>
              <span className={cn("h-3 w-3 rounded-full", dotClass(g.status))} title={g.status} />
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2 text-cb-text">
                <dt className="flex items-center gap-1 text-cb-text-muted">
                  <Gauge className="h-3.5 w-3.5" aria-hidden />
                  Success
                </dt>
                <dd className="font-bold tabular-nums">{g.success_pct.toFixed(1)}%</dd>
              </div>
              <div className="flex items-center justify-between gap-2 text-cb-text">
                <dt className="flex items-center gap-1 text-cb-text-muted">
                  <Timer className="h-3.5 w-3.5" aria-hidden />
                  Est. latency
                </dt>
                <dd className="font-bold tabular-nums">{g.latency_ms} ms</dd>
              </div>
              <div className="flex items-center justify-between gap-2 text-cb-text">
                <dt className="flex items-center gap-1 text-cb-text-muted">
                  <Wifi className="h-3.5 w-3.5" aria-hidden />
                  Uptime (model)
                </dt>
                <dd className="font-bold tabular-nums">{g.uptime_pct.toFixed(2)}%</dd>
              </div>
              <div className="pt-1 text-[11px] text-cb-text-muted">Volume: {g.volume} tx</div>
            </dl>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
