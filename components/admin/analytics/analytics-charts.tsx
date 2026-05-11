"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsDashboardData } from "@/services/analytics";

type Props = {
  charts: AnalyticsDashboardData["charts"];
};

function shortDateLabel(date: string): string {
  return date.slice(5);
}

export function AnalyticsCharts({ charts }: Props) {
  const tooltipStyle = {
    borderRadius: 12,
    fontSize: 12,
    backgroundColor: "var(--cb-surface-elevated)",
    border: "1px solid var(--cb-border)",
    color: "var(--cb-text-strong)",
  } as const;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm">
          <h3 className="text-sm font-bold text-cb-text-strong">Revenue Over Time</h3>
          <div className="mt-3 h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.revenueOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-cb-border/60" />
                <XAxis dataKey="date" tickFormatter={shortDateLabel} tick={{ fontSize: 10 }} stroke="var(--cb-text)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--cb-text)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2.4} dot={false} isAnimationActive />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm">
          <h3 className="text-sm font-bold text-cb-text-strong">Orders by Day</h3>
          <div className="mt-3 h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.ordersByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-cb-border/60" />
                <XAxis dataKey="date" tickFormatter={shortDateLabel} tick={{ fontSize: 10 }} stroke="var(--cb-text)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--cb-text)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="orders" fill="#f97316" radius={[7, 7, 0, 0]} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm">
          <h3 className="text-sm font-bold text-cb-text-strong">Top Products</h3>
          <div className="mt-3 h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.topProducts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-cb-border/60" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--cb-text)" />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} stroke="var(--cb-text)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="sales" fill="#8b5cf6" radius={[0, 8, 8, 0]} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm">
          <h3 className="text-sm font-bold text-cb-text-strong">Customer Growth</h3>
          <div className="mt-3 h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-cb-border/60" />
                <XAxis dataKey="date" tickFormatter={shortDateLabel} tick={{ fontSize: 10 }} stroke="var(--cb-text)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--cb-text)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="customers" stroke="#38bdf8" strokeWidth={2.2} dot={false} isAnimationActive />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
}
