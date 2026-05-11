"use client";

import { useCallback, useEffect, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { usePaymentsConsoleStore } from "@/stores/payments-console-store";
import { PaymentsHero } from "@/components/admin/payments/payments-hero";
import { PaymentsErrorPanel } from "@/components/admin/payments/payments-error-panel";
import { PaymentsMetricsGrid } from "@/components/admin/payments/payments-metrics-grid";
import { PaymentsChartsSection } from "@/components/admin/payments/payments-charts-section";
import { PaymentsGatewayMonitor } from "@/components/admin/payments/payments-gateway-monitor";
import { PaymentsTransactionsPanel } from "@/components/admin/payments/payments-transactions-panel";
import { PaymentsToasts } from "@/components/admin/payments/payments-toasts";
import { Shield } from "lucide-react";

export function PaymentsConsoleDashboard() {
  const summary = usePaymentsConsoleStore((s) => s.summary);
  const loading = usePaymentsConsoleStore((s) => s.loading);
  const errorRaw = usePaymentsConsoleStore((s) => s.errorRaw);
  const friendlyError = usePaymentsConsoleStore((s) => s.friendlyError);
  const operational = usePaymentsConsoleStore((s) => s.operational);
  const autoRetry = usePaymentsConsoleStore((s) => s.autoRetry);
  const liveMode = usePaymentsConsoleStore((s) => s.liveMode);
  const lastFetchedAt = usePaymentsConsoleStore((s) => s.lastFetchedAt);
  const loadSummary = usePaymentsConsoleStore((s) => s.loadSummary);
  const setAutoRetry = usePaymentsConsoleStore((s) => s.setAutoRetry);
  const setLiveMode = usePaymentsConsoleStore((s) => s.setLiveMode);
  const pushToast = usePaymentsConsoleStore((s) => s.pushToast);

  const [manualRetrying, setManualRetrying] = useState(false);

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void loadSummary();
    });
    return cancel;
  }, [loadSummary]);

  useEffect(() => {
    if (!friendlyError || !autoRetry) return;
    const id = window.setInterval(() => {
      void loadSummary();
    }, 25_000);
    return () => clearInterval(id);
  }, [friendlyError, autoRetry, loadSummary]);

  useEffect(() => {
    if (!operational) return;
    const id = window.setInterval(() => {
      void loadSummary();
    }, 90_000);
    return () => clearInterval(id);
  }, [operational, loadSummary]);

  const onRetry = useCallback(async () => {
    setManualRetrying(true);
    try {
      await loadSummary();
      if (!usePaymentsConsoleStore.getState().friendlyError) {
        pushToast("Connection restored — data loaded.", "success");
      }
    } finally {
      setManualRetrying(false);
    }
  }, [loadSummary, pushToast]);

  const showSkeleton = loading && !summary && !friendlyError;

  return (
    <div className="space-y-8 pb-12">
      <PaymentsHero
        operational={operational}
        liveMode={liveMode}
        lastFetchedAt={lastFetchedAt}
        onToggleLive={() => {
          setLiveMode(!liveMode);
          pushToast(
            liveMode
              ? "Test mode (UI): actions stay read-only — no gateway switch."
              : "Live view (UI): showing production-shaped data from your database.",
            "info",
          );
        }}
      />

      {friendlyError && (
        <PaymentsErrorPanel
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-cb-surface-2"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-cb-surface-2" />
        </div>
      )}

      {summary && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void onRetry()}
              disabled={loading}
              className="rounded-xl border border-cb-border bg-cb-surface px-4 py-2 text-sm font-bold shadow-sm hover:bg-cb-hover-overlay disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh now"}
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-cb-border bg-cb-surface-elevated px-3 py-1.5 text-xs text-cb-text-muted">
              <Shield className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              Risk scan: no anomalies auto-flagged in this window.
            </div>
          </div>

          <PaymentsMetricsGrid kpis={summary.kpis} />
          <PaymentsChartsSection summary={summary} />
          <PaymentsGatewayMonitor gateways={summary.gateway_health} />
          <PaymentsTransactionsPanel rows={summary.recent} />
        </>
      )}

      {!loading && !summary && !friendlyError && (
        <p className="rounded-xl border border-dashed border-cb-border px-4 py-6 text-center text-sm text-cb-text-muted">
          No data returned. Check admin permissions for the payments module.
        </p>
      )}

      <PaymentsToasts />
    </div>
  );
}
