"use client";

import { motion, useReducedMotion } from "motion/react";
import { Activity, Banknote, CheckCircle2, Clock3, TrendingUp, XCircle } from "lucide-react";
import type { PaymentSummaryResponse } from "@/lib/payments/payment-summary-types";
import { cn } from "@/lib/utils";

type Props = {
  kpis: PaymentSummaryResponse["kpis"];
};

const card =
  "rounded-2xl border p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-5";

export function PaymentsMetricsGrid({ kpis }: Props) {
  const reduceMotion = useReducedMotion();

  const items = [
    {
      label: "Total transactions",
      value: String(kpis.total_transactions),
      sub: "Loaded window",
      icon: Activity,
      className:
        "border-slate-200/90 bg-gradient-to-br from-slate-50 to-white text-slate-900 dark:border-slate-800 dark:from-slate-900/40 dark:to-slate-950/30 dark:text-slate-100",
    },
    {
      label: "Success rate",
      value: `${kpis.success_rate_pct.toFixed(1)}%`,
      sub: "Paid vs failed",
      icon: CheckCircle2,
      className:
        "border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-white text-emerald-950 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-emerald-950/20 dark:text-emerald-50",
    },
    {
      label: "Failed",
      value: String(kpis.failed_count),
      sub: "Needs attention",
      icon: XCircle,
      className:
        "border-red-200/90 bg-gradient-to-br from-red-50 to-white text-red-950 dark:border-red-900/50 dark:from-red-950/40 dark:to-red-950/20 dark:text-red-50",
    },
    {
      label: "Pending (unpaid)",
      value: String(kpis.unpaid_count),
      sub: "Open intents",
      icon: Clock3,
      className:
        "border-amber-200/90 bg-gradient-to-br from-amber-50 to-white text-amber-950 dark:border-amber-900/50 dark:from-amber-950/40 dark:to-amber-950/20 dark:text-amber-50",
    },
    {
      label: "Captured revenue",
      value: `EGP ${Math.round(kpis.total_captured_egp).toLocaleString()}`,
      sub: `${kpis.paid_count} paid orders`,
      icon: Banknote,
      className:
        "border-cyan-200/90 bg-gradient-to-br from-cyan-50 to-white text-cyan-950 dark:border-cyan-900/50 dark:from-cyan-950/40 dark:to-cyan-950/20 dark:text-cyan-50",
    },
    {
      label: "Avg ticket (paid)",
      value: `EGP ${kpis.avg_paid_ticket_egp.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      sub: "Mean order value",
      icon: TrendingUp,
      className:
        "border-violet-200/90 bg-gradient-to-br from-violet-50 to-white text-violet-950 dark:border-violet-900/50 dark:from-violet-950/40 dark:to-violet-950/20 dark:text-violet-50",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, i) => (
        <motion.article
          key={item.label}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.28 }}
          className={cn(card, item.className)}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{item.label}</p>
            <item.icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold tabular-nums tracking-tight">{item.value}</p>
          <p className="mt-1 text-xs opacity-75">{item.sub}</p>
        </motion.article>
      ))}
    </div>
  );
}
