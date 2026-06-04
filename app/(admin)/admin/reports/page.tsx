"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, FilePlus2, RefreshCw } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { buttonClassName } from "@/components/ui/button";
import { fetchJson } from "@/lib/http/fetch-json";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import type { AnalyticsDashboardData } from "@/services/analytics";
import { useLanguage } from "@/components/providers/language-provider";
import { GiftAddonInsightsPanel } from "@/components/admin/reports/gift-addon-insights-panel";

const ChartsSection = dynamic(
  () =>
    import("@/components/admin/analytics/analytics-charts").then((mod) => mod.AnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="h-72 animate-pulse rounded-2xl border border-cb-border bg-cb-surface-elevated"
          />
        ))}
      </div>
    ),
  },
);

type RangePreset = "7d" | "30d" | "90d" | "custom";
type Segment = "all" | "registered" | "guest";

type ApiResponse = AnalyticsDashboardData & {
  actor?: { role?: string; permission?: string };
  error?: { en?: string };
  details?: string;
  debug?: Record<string, unknown>;
};

type Filters = {
  range: RangePreset;
  from: string;
  to: string;
  product: string;
  category: string;
  segment: Segment;
};

function money(value: number): string {
  return `EGP ${Math.round(value).toLocaleString("en-EG")}`;
}

function pct(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

function useCountUp(target: number, durationMs = 650): number {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = display;
    const diff = target - from;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setDisplay(from + diff * t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return display;
}

function Sparkline({ values }: { values: number[] }) {
  const data = values.map((v, idx) => ({ idx, value: v }));
  return (
    <div className="mt-3 h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--cb-terracotta-dark)"
            fill="var(--cb-terracotta)"
            fillOpacity={0.15}
            strokeWidth={2}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  title,
  value,
  deltaPct,
  trend,
  formatter,
}: {
  title: string;
  value: number;
  deltaPct: number;
  trend: number[];
  formatter: (value: number) => string;
}) {
  const shown = useCountUp(value);
  const positive = deltaPct >= 0;
  return (
    <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-cb-text-muted">{title}</p>
      <p className="mt-2 text-2xl font-bold text-cb-text-strong">{formatter(shown)}</p>
      <p className={`mt-1 text-xs font-semibold ${positive ? "text-emerald-600" : "text-red-600"}`}>
        {pct(deltaPct)} this period
      </p>
      <Sparkline values={trend} />
    </article>
  );
}

function toCsv(data: AnalyticsDashboardData): string {
  const header = ["date", "revenue", "orders", "customers"];
  const customerMap = new Map(data.charts.customerGrowth.map((row) => [row.date, row.customers]));
  const ordersMap = new Map(data.charts.ordersByDay.map((row) => [row.date, row.orders]));
  const lines = data.charts.revenueOverTime.map((row) =>
    [row.date, row.revenue, ordersMap.get(row.date) ?? 0, customerMap.get(row.date) ?? 0].join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

function buildInitialFilters(): Filters {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return {
    range: "30d",
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    product: "",
    category: "",
    segment: "all",
  };
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-cb-border bg-cb-surface-elevated p-8 text-center">
      <p className="text-base font-semibold text-cb-text-strong">No data yet</p>
      <p className="mt-1 text-sm text-cb-text-muted">Start selling to see insights 🚀</p>
    </div>
  );
}

export default function AdminReportsPage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<Filters>(() => buildInitialFilters());
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>(() => buildInitialFilters());
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<Record<string, unknown> | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedFilters(filters);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [filters]);

  const load = useMemo(
    () => async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          range: debouncedFilters.range,
          segment: debouncedFilters.segment,
        });
        if (debouncedFilters.range === "custom") {
          if (debouncedFilters.from) params.set("from", debouncedFilters.from);
          if (debouncedFilters.to) params.set("to", debouncedFilters.to);
        }
        if (debouncedFilters.product.trim()) params.set("product", debouncedFilters.product.trim());
        if (debouncedFilters.category.trim()) params.set("category", debouncedFilters.category.trim());

        const payload = await fetchJson<ApiResponse>(
          `/api/admin/reports/overview?${params.toString()}`,
          {
            cache: "no-store",
            timeoutMs: 20_000,
            retries: 1,
            retryDelayMs: 300,
          },
        );
        setData(payload);
        setDebug(payload.debug ?? (payload.meta?.debug as Record<string, unknown> | undefined) ?? null);
        setIsOwner(payload.actor?.role === "owner");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load analytics";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedFilters],
  );

  useEffect(() => {
    let cancelled = false;
    const cancelSchedule = scheduleEffectTask(() => {
      if (!cancelled) void load(false);
    });
    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const csv = toCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice("CSV export completed.");
  };

  const createManualInvoice = async () => {
    const raw = window.prompt("Manual invoice amount (EGP)", "100");
    if (raw == null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      setNotice("Invalid amount.");
      return;
    }
    try {
      await fetchJson("/api/admin/invoices", {
        method: "POST",
        jsonBody: { amount_egp: amount, status: "pending", order_id: null },
      });
      setNotice("Manual invoice draft created — view Invoices.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Invoice creation failed");
    }
  };

  const empty =
    !loading &&
    !error &&
    data != null &&
    data.charts.revenueOverTime.every((row) => row.revenue === 0) &&
    data.charts.ordersByDay.every((row) => row.orders === 0);

  return (
    <section className="space-y-5">
      <header className="admin-panel-surface rounded-2xl p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">{t("adminPages.reports.title")}</h1>
        <p className="mt-2 text-sm text-cb-text-muted">{t("adminPages.reports.subtitle")}</p>
      </header>

      <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
        <div className="grid gap-3 lg:grid-cols-12">
          <label className="text-xs font-bold uppercase tracking-wide text-cb-text-muted lg:col-span-2">
            Date range
            <select
              value={filters.range}
              onChange={(e) => setFilters((prev) => ({ ...prev, range: e.target.value as RangePreset }))}
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-cb-text-muted lg:col-span-2">
            From
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value, range: "custom" }))}
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-cb-text-muted lg:col-span-2">
            To
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value, range: "custom" }))}
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-cb-text-muted lg:col-span-2">
            Product
            <input
              value={filters.product}
              onChange={(e) => setFilters((prev) => ({ ...prev, product: e.target.value }))}
              placeholder="Chocolate Box"
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-cb-text-muted lg:col-span-2">
            Category
            <input
              value={filters.category}
              onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
              placeholder="Gift"
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-cb-text-muted lg:col-span-2">
            Segment
            <select
              value={filters.segment}
              onChange={(e) => setFilters((prev) => ({ ...prev, segment: e.target.value as Segment }))}
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong"
            >
              <option value="all">All</option>
              <option value="registered">Registered</option>
              <option value="guest">Guest</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} className={buttonClassName("outline", "px-4 py-2 text-xs")} disabled={!data}>
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void createManualInvoice()}
            className={buttonClassName("subtle", "px-4 py-2 text-xs")}
          >
            <FilePlus2 className="h-4 w-4" />
            Create Invoice (manual)
          </button>
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void load(true);
            }}
            className={buttonClassName("ghost", "px-4 py-2 text-xs")}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {notice ? (
        <div className="rounded-xl border border-cb-border bg-cb-surface px-4 py-2 text-sm text-cb-text">{notice}</div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-36 animate-pulse rounded-2xl border border-cb-border bg-cb-surface-elevated" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-72 animate-pulse rounded-2xl border border-cb-border bg-cb-surface-elevated" />
            ))}
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-red-300/80 bg-red-50/80 p-5 dark:border-red-900 dark:bg-red-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-700 dark:text-red-300" />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-red-900 dark:text-red-100">⚠️ Failed to load analytics</h2>
              <p className="mt-1 text-sm text-red-800 dark:text-red-200">{error}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void load(false)} className={buttonClassName("primary", "px-4 py-2 text-xs")}>
                  Retry
                </button>
                <a href="/admin/audit-logs" className={buttonClassName("outline", "px-4 py-2 text-xs")}>
                  View Logs
                </a>
              </div>
              {isOwner && debug ? (
                <details className="mt-3 rounded-lg border border-red-300/70 bg-white/70 p-3 text-xs text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
                  <summary className="cursor-pointer font-semibold">Owner Debug Info</summary>
                  <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(debug, null, 2)}</pre>
                </details>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !error && data ? (
        <>
          {empty ? <EmptyState /> : null}

          {!empty ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  title={data.kpis.revenue.title}
                  value={data.kpis.revenue.value}
                  deltaPct={data.kpis.revenue.deltaPct}
                  trend={data.kpis.revenue.trend}
                  formatter={money}
                />
                <KpiCard
                  title={data.kpis.orders.title}
                  value={data.kpis.orders.value}
                  deltaPct={data.kpis.orders.deltaPct}
                  trend={data.kpis.orders.trend}
                  formatter={(v) => Math.round(v).toLocaleString("en-EG")}
                />
                <KpiCard
                  title={data.kpis.customers.title}
                  value={data.kpis.customers.value}
                  deltaPct={data.kpis.customers.deltaPct}
                  trend={data.kpis.customers.trend}
                  formatter={(v) => Math.round(v).toLocaleString("en-EG")}
                />
                <KpiCard
                  title={data.kpis.conversionRate.title}
                  value={data.kpis.conversionRate.value}
                  deltaPct={data.kpis.conversionRate.deltaPct}
                  trend={data.kpis.conversionRate.trend}
                  formatter={(v) => `${v.toFixed(2)}%`}
                />
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[780px]">
                  <ChartsSection charts={data.charts} />
                </div>
              </div>

              <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
                <h2 className="text-lg font-bold text-cb-text-strong">Insights Engine</h2>
                <ul className="mt-3 space-y-2 text-sm text-cb-text">
                  <li className="rounded-xl border border-cb-border px-3 py-2">{data.insights.revenueDeltaText}</li>
                  <li className="rounded-xl border border-cb-border px-3 py-2">{data.insights.topProductText}</li>
                  <li className="rounded-xl border border-cb-border px-3 py-2">{data.insights.activeDayText}</li>
                </ul>
              </section>
            </>
          ) : null}
        </>
      ) : null}

      <GiftAddonInsightsPanel />
    </section>
  );
}

