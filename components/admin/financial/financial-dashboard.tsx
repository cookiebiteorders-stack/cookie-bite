"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { useFinancialDashboardStore } from "@/stores/financial-dashboard-store";
import { buildFinancialInsights } from "@/lib/financial/insights";
import { FinancialHero } from "@/components/admin/financial/financial-hero";
import { FinancialErrorPanel } from "@/components/admin/financial/financial-error-panel";
import { FinancialKpiCards } from "@/components/admin/financial/financial-kpi-cards";
import { FinancialChartsSection } from "@/components/admin/financial/financial-charts-section";
import { FinancialBudgetStrip } from "@/components/admin/financial/financial-budget-strip";
import { FinancialInsightsPanel } from "@/components/admin/financial/financial-insights-panel";
import { FinancialExpenseForm } from "@/components/admin/financial/financial-expense-form";
import { FinancialLedgerTable } from "@/components/admin/financial/financial-ledger-table";
import { FinancialToasts } from "@/components/admin/financial/financial-toasts";

export function FinancialDashboard() {
  const summary = useFinancialDashboardStore((s) => s.summary);
  const loading = useFinancialDashboardStore((s) => s.loading);
  const friendlyError = useFinancialDashboardStore((s) => s.friendlyError);
  const errorRaw = useFinancialDashboardStore((s) => s.errorRaw);
  const preset = useFinancialDashboardStore((s) => s.preset);
  const customFrom = useFinancialDashboardStore((s) => s.customFrom);
  const customTo = useFinancialDashboardStore((s) => s.customTo);
  const compareMode = useFinancialDashboardStore((s) => s.compareMode);
  const autoRetry = useFinancialDashboardStore((s) => s.autoRetry);
  const budgetMonthlyEgp = useFinancialDashboardStore((s) => s.budgetMonthlyEgp);
  const showUsd = useFinancialDashboardStore((s) => s.showUsd);
  const loadSummary = useFinancialDashboardStore((s) => s.loadSummary);
  const setPreset = useFinancialDashboardStore((s) => s.setPreset);
  const setCustomRange = useFinancialDashboardStore((s) => s.setCustomRange);
  const setCompareMode = useFinancialDashboardStore((s) => s.setCompareMode);
  const setAutoRetry = useFinancialDashboardStore((s) => s.setAutoRetry);
  const setBudget = useFinancialDashboardStore((s) => s.setBudget);
  const setShowUsd = useFinancialDashboardStore((s) => s.setShowUsd);

  const [manualRetrying, setManualRetrying] = useState(false);

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void loadSummary();
    });
    return cancel;
  }, [loadSummary, preset, customFrom, customTo, compareMode]);

  useEffect(() => {
    if (!friendlyError || !autoRetry) return;
    const id = window.setInterval(() => {
      void loadSummary();
    }, 5000);
    return () => clearInterval(id);
  }, [friendlyError, autoRetry, loadSummary]);

  const onRetry = useCallback(async () => {
    setManualRetrying(true);
    try {
      await loadSummary();
    } finally {
      setManualRetrying(false);
    }
  }, [loadSummary]);

  const insights = useMemo(() => {
    if (!summary) return [];
    return buildFinancialInsights(summary.daily, summary.comparison, summary.kpis.expenses_egp);
  }, [summary]);

  const showSkeleton = loading && !summary && !friendlyError;

  return (
    <div className="space-y-8 pb-14">
      <FinancialHero
        preset={preset}
        onPreset={setPreset}
        customFrom={customFrom}
        customTo={customTo}
        onCustomChange={setCustomRange}
        onRefresh={() => void loadSummary()}
        loading={loading}
        compareMode={compareMode}
        onCompare={setCompareMode}
      />

      {friendlyError && (
        <FinancialErrorPanel
          friendly={friendlyError}
          technical={friendlyError.technical ?? errorRaw ?? undefined}
          onRetry={() => void onRetry()}
          retrying={manualRetrying || loading}
          autoRetry={autoRetry}
          onToggleAutoRetry={() => setAutoRetry(!autoRetry)}
        />
      )}

      {showSkeleton && (
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-cb-surface-2" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-cb-surface-2" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-cb-surface-2" />
        </div>
      )}

      {summary && (
        <>
          <FinancialKpiCards
            kpis={summary.kpis}
            comparison={summary.comparison}
            showUsd={showUsd}
            onToggleUsd={() => setShowUsd(!showUsd)}
          />
          <FinancialBudgetStrip
            budgetMonthlyEgp={budgetMonthlyEgp}
            spentEgp={summary.kpis.expenses_egp}
            onBudgetChange={setBudget}
          />
          <FinancialChartsSection summary={summary} />
          <FinancialInsightsPanel insights={insights} />
          <FinancialExpenseForm />
          <FinancialLedgerTable ledger={summary.ledger} />
        </>
      )}

      {!loading && !summary && !friendlyError && (
        <p className="rounded-xl border border-dashed border-cb-border px-4 py-6 text-center text-sm text-cb-text-muted">
          No financial data returned. Confirm you have access to the financial module.
        </p>
      )}

      <FinancialToasts />
    </div>
  );
}
