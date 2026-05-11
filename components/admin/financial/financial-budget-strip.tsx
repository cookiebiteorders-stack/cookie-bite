"use client";

import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  budgetMonthlyEgp: number;
  spentEgp: number;
  onBudgetChange: (n: number) => void;
};

export function FinancialBudgetStrip({ budgetMonthlyEgp, spentEgp, onBudgetChange }: Props) {
  const pct = budgetMonthlyEgp <= 0 ? 0 : Math.min(100, (spentEgp / budgetMonthlyEgp) * 100);
  const over = spentEgp > budgetMonthlyEgp && budgetMonthlyEgp > 0;

  return (
    <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cb-peach/40 text-cb-terracotta-dark">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-cb-text-strong">Monthly budget (EGP)</h2>
            <p className="text-xs text-cb-text-muted">
              Local target for this console — prorated against spend in the selected range.
            </p>
          </div>
        </div>
        <label className="flex flex-col text-xs font-bold uppercase text-cb-text-muted sm:w-44">
          Budget
          <input
            type="number"
            min={0}
            step={100}
            value={budgetMonthlyEgp}
            onChange={(e) => onBudgetChange(Number(e.target.value) || 0)}
            className="mt-1 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm font-semibold text-cb-text-strong"
          />
        </label>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs font-semibold text-cb-text-muted">
          <span>Spend in range</span>
          <span>
            EGP {Math.round(spentEgp).toLocaleString()} / {Math.round(budgetMonthlyEgp).toLocaleString()}
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-cb-surface-2">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              over ? "bg-red-500" : pct > 85 ? "bg-amber-500" : "bg-emerald-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {over && (
          <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">
            Spend exceeded the budget target for this view.
          </p>
        )}
      </div>
    </section>
  );
}
