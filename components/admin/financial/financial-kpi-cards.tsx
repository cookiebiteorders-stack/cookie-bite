"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Banknote, PiggyBank, Scale, TrendingUp, Wallet } from "lucide-react";
import type { FinancialComparisonBlock, FinancialSummaryResponse } from "@/lib/financial/types";
import { EGP_PER_USD } from "@/lib/shipping/currency";
import { cn } from "@/lib/utils";

type Props = {
  kpis: FinancialSummaryResponse["kpis"];
  comparison: FinancialComparisonBlock | null;
  showUsd: boolean;
  onToggleUsd: () => void;
};

function fmtEgp(n: number) {
  return `EGP ${Math.round(n).toLocaleString()}`;
}

function fmtUsd(n: number) {
  return `USD ${(n / EGP_PER_USD).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function cmpChip(
  label: string,
  current: number,
  prev: number | null,
) {
  if (prev == null) return null;
  const d = current - prev;
  const pct = prev === 0 ? null : (d / prev) * 100;
  const up = d > 0;
  return (
    <span
      className={cn(
        "mt-1 inline-flex items-center gap-1 text-[10px] font-bold",
        up ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300",
      )}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {label} {pct == null ? "—" : `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`}
    </span>
  );
}

export function FinancialKpiCards({ kpis, comparison, showUsd, onToggleUsd }: Props) {
  const reduceMotion = useReducedMotion();
  const netPositive = kpis.net_egp >= 0;

  const cards = [
    {
      label: "Total revenue",
      value: showUsd ? fmtUsd(kpis.revenue_egp) : fmtEgp(kpis.revenue_egp),
      sub: `${kpis.paid_orders_count} paid orders`,
      icon: TrendingUp,
      wrap: "border-emerald-200/90 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/35",
    },
    {
      label: "Total expenses",
      value: showUsd ? fmtUsd(kpis.expenses_egp) : fmtEgp(kpis.expenses_egp),
      sub: "Recorded in ledger",
      icon: Banknote,
      wrap: "border-red-200/90 bg-red-50 dark:border-red-900/40 dark:bg-red-950/35",
    },
    {
      label: "Net profit",
      value: showUsd ? fmtUsd(kpis.net_egp) : fmtEgp(kpis.net_egp),
      sub: netPositive ? "Above costs" : "Below costs",
      icon: Scale,
      wrap: cn(
        "border-slate-200/90 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50",
        netPositive && "border-emerald-300/90 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
        !netPositive && "border-red-300/90 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40",
      ),
    },
    {
      label: "Profit margin",
      value: `${kpis.profit_margin_pct.toFixed(1)}%`,
      sub: "Net ÷ revenue",
      icon: PiggyBank,
      wrap: "border-violet-200/90 bg-violet-50 dark:border-violet-900/40 dark:bg-violet-950/35",
    },
    {
      label: "Cash flow (net)",
      value: showUsd ? fmtUsd(kpis.cash_flow_egp) : fmtEgp(kpis.cash_flow_egp),
      sub: "Same as net in this view",
      icon: Wallet,
      wrap: "border-cyan-200/90 bg-cyan-50 dark:border-cyan-900/40 dark:bg-cyan-950/35",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-cb-text-muted">Overview</p>
        <button
          type="button"
          onClick={onToggleUsd}
          className="rounded-full border border-cb-border bg-cb-surface px-3 py-1 text-[11px] font-bold"
        >
          {showUsd ? "Show EGP" : `Show USD (~${EGP_PER_USD} EGP)`}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c, i) => (
          <motion.article
            key={c.label}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              "rounded-2xl border p-4 shadow-sm transition-transform hover:-translate-y-0.5 sm:p-5",
              c.wrap,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-cb-text-strong">{c.label}</p>
              <c.icon className="h-4 w-4 shrink-0 text-cb-text" />
            </div>
            <p className="mt-2 font-serif text-xl font-bold tabular-nums text-cb-text-strong sm:text-2xl">
              {c.value}
            </p>
            <p className="text-xs text-cb-text">{c.sub}</p>
            {comparison && c.label === "Total revenue" && cmpChip("vs prev.", kpis.revenue_egp, comparison.revenue_egp)}
            {comparison && c.label === "Total expenses" && cmpChip("vs prev.", kpis.expenses_egp, comparison.expenses_egp)}
            {comparison && c.label === "Net profit" && cmpChip("vs prev.", kpis.net_egp, comparison.net_egp)}
          </motion.article>
        ))}
      </div>
    </div>
  );
}
