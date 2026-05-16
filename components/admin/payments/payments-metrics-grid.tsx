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
        "border-slate-200/90 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100",
    },
    {
      label: "Success rate",
      value: `${kpis.success_rate_pct.toFixed(1)}%`,
      sub: "Paid vs failed",
      icon: CheckCircle2,
      className:
        "border-emerald-200/90 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-50",
    },
    {
      label: "Failed",
      value: String(kpis.failed_count),
      sub: "Needs attention",
      icon: XCircle,
      className:
        "border-red-200/90 bg-red-50 text-red-950 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-50",
    },
    {
      label: "Pending (unpaid)",
      value: String(kpis.unpaid_count),
      sub: "Open intents",
      icon: Clock3,
      className:
        "border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-50",
    },
    {
      label: "Captured revenue",
      value: `EGP ${Math.round(kpis.total_captured_egp).toLocaleString()}`,
      sub: `${kpis.paid_count} paid orders`,
      icon: Banknote,
      className:
        "border-cyan-200/90 bg-cyan-50 text-cyan-950 dark:border-cyan-900/50 dark:bg-cyan-950/35 dark:text-cyan-50",
    },
    {
      label: "Avg ticket (paid)",
      value: `EGP ${kpis.avg_paid_ticket_egp.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      sub: "Mean order value",
      icon: TrendingUp,
      className:
        "border-violet-200/90 bg-violet-50 text-violet-950 dark:border-violet-900/50 dark:bg-violet-950/35 dark:text-violet-50",
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
            <p className="text-[11px] font-bold uppercase tracking-wide text-current">{item.label}</p>
            <item.icon className="h-4 w-4 shrink-0 text-current" aria-hidden />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold tabular-nums tracking-tight">{item.value}</p>
          <p className="mt-1 text-xs text-current">{item.sub}</p>
        </motion.article>
      ))}
    </div>
  );
}
