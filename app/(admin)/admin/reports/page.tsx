"use client";

import { useEffect, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { fetchJson } from "@/lib/http/fetch-json";

type OverviewResponse = {
  kpis: {
    revenue_30d_egp: number;
    orders_30d: number;
    aov_30d_egp: number;
    customers_total: number;
  };
  order_status_breakdown: Record<string, number>;
  top_products: Array<{ name: string; quantity: number; revenue_egp: number }>;
};

type FinancialResponse = {
  revenue_30d_egp: number;
  expenses_total_egp: number;
  net_egp: number;
  expenses_by_category: Record<string, number>;
};

export default function AdminReportsPage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [financial, setFinancial] = useState<FinancialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const ad = await fetchJson<OverviewResponse>("/api/admin/reports/overview", {
          cache: "no-store",
          timeoutMs: 15_000,
          retries: 1,
          retryDelayMs: 250,
        });
        let financialData: FinancialResponse = {
          revenue_30d_egp: 0,
          expenses_total_egp: 0,
          net_egp: 0,
          expenses_by_category: {},
        };
        try {
          financialData = await fetchJson<FinancialResponse>("/api/admin/financial/summary", {
            cache: "no-store",
            timeoutMs: 15_000,
            retries: 1,
            retryDelayMs: 250,
          });
        } catch {
          // Financial module may be unavailable by role; keep analytics visible.
        }
        if (!cancelled) {
          setOverview(ad);
          setFinancial(financialData);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load reports");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const cancelSchedule = scheduleEffectTask(() => {
      void load();
    });
    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, []);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
          Advanced Analytics & BI
        </h1>
        <p className="mt-2 text-sm text-cb-text">
          Revenue trends, product performance, customer cohorts, and operational KPIs.
        </p>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5 text-sm text-cb-text-muted">
          Loading reports...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5 text-sm text-red-600">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold text-cb-text-strong"
          >
            Retry / إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase text-cb-text-muted">Revenue (30d)</p>
              <p className="mt-1 text-2xl font-bold text-cb-text-strong">
                EGP {Math.round(overview?.kpis.revenue_30d_egp ?? 0).toLocaleString()}
              </p>
            </article>
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase text-cb-text-muted">Orders (30d)</p>
              <p className="mt-1 text-2xl font-bold text-cb-text-strong">{overview?.kpis.orders_30d ?? 0}</p>
            </article>
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase text-cb-text-muted">AOV (30d)</p>
              <p className="mt-1 text-2xl font-bold text-cb-text-strong">
                EGP {Math.round(overview?.kpis.aov_30d_egp ?? 0).toLocaleString()}
              </p>
            </article>
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase text-cb-text-muted">Net</p>
              <p className="mt-1 text-2xl font-bold text-cb-text-strong">
                EGP {Math.round(financial?.net_egp ?? 0).toLocaleString()}
              </p>
            </article>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
              <h2 className="text-lg font-bold text-cb-text-strong">Order Status Breakdown</h2>
              <ul className="mt-3 space-y-2 text-sm text-cb-text">
                {Object.entries(overview?.order_status_breakdown ?? {}).map(([status, count]) => (
                  <li key={status} className="flex items-center justify-between rounded-lg border border-cb-border px-3 py-2">
                    <span>{status}</span>
                    <span className="font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
              <h2 className="text-lg font-bold text-cb-text-strong">Top Products (30d)</h2>
              <ul className="mt-3 space-y-2 text-sm text-cb-text">
                {(overview?.top_products ?? []).map((p) => (
                  <li key={p.name} className="rounded-lg border border-cb-border px-3 py-2">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-cb-text-muted">
                      Qty: {p.quantity} | Revenue: EGP {Math.round(p.revenue_egp).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </>
      )}
    </section>
  );
}

