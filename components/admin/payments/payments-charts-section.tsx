"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PaymentSummaryResponse } from "@/lib/payments/payment-summary-types";
import { cn } from "@/lib/utils";

type Props = {
  summary: PaymentSummaryResponse;
};

const PIE_COLORS = ["#22c55e", "#ef4444", "#fbbf24", "#38bdf8", "#ff6b9d", "#e8782a"];

export function PaymentsChartsSection({ summary }: Props) {
  const [rangeDays, setRangeDays] = useState<7 | 14>(14);

  const trend = useMemo(() => {
    const slice = rangeDays === 7 ? summary.daily_trend.slice(-7) : summary.daily_trend;
    return slice.map((d) => ({
      ...d,
      label: d.date.slice(5),
    }));
  }, [summary.daily_trend, rangeDays]);

  const pieData = useMemo(() => {
    const entries = Object.entries(summary.by_status).map(([name, value]) => ({
      name,
      value,
    }));
    return entries.filter((e) => e.value > 0);
  }, [summary.by_status]);

  const barData = useMemo(
    () =>
      summary.method_mix.slice(0, 8).map((m) => ({
        method: m.method.length > 14 ? `${m.method.slice(0, 14)}…` : m.method,
        paid: m.paid,
        failed: m.failed,
      })),
    [summary.method_mix],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold text-cb-text-strong">Analytics</h2>
          <p className="text-sm text-cb-text-muted">Hover for tooltips — data from your latest order window.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRangeDays(7)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              rangeDays === 7
                ? "bg-cb-terracotta-dark text-white"
                : "border border-cb-border bg-cb-surface text-cb-text",
            )}
          >
            7 days
          </button>
          <button
            type="button"
            onClick={() => setRangeDays(14)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              rangeDays === 14
                ? "bg-cb-terracotta-dark text-white"
                : "border border-cb-border bg-cb-surface text-cb-text",
            )}
          >
            14 days
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm">
          <h3 className="text-sm font-bold text-cb-text-strong">Transactions over time</h3>
          <div className="mt-3 h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-cb-border/60" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--cb-text-muted)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--cb-text-muted)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--cb-border)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="paid" name="Paid" stroke="#16a34a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="failed" name="Failed" stroke="#dc2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm">
          <h3 className="text-sm font-bold text-cb-text-strong">Status distribution</h3>
          <div className="mt-3 h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--cb-border)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm xl:col-span-1">
          <h3 className="text-sm font-bold text-cb-text-strong">Payment method mix</h3>
          <div className="mt-3 h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-cb-border/60" />
                <XAxis dataKey="method" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={48} stroke="var(--cb-text-muted)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--cb-text-muted)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--cb-border)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="paid" name="Paid" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
