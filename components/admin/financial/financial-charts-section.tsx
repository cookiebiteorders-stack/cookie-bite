"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
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
import type { FinancialSummaryResponse } from "@/lib/financial/types";

const PIE_COLORS = ["#c1692c", "#84441b", "#dd8447", "#3d9a72", "#6366f1", "#a855f7", "#64748b"];

type Props = { summary: FinancialSummaryResponse };

export function FinancialChartsSection({ summary }: Props) {
  const lineData = useMemo(
    () =>
      summary.daily.map((d) => ({
        label: d.date.slice(5),
        revenue: d.revenue_egp,
        expenses: d.expenses_egp,
      })),
    [summary.daily],
  );

  const profitArea = useMemo(
    () =>
      summary.daily.map((d) => ({
        label: d.date.slice(5),
        profit: d.net_egp,
      })),
    [summary.daily],
  );

  const cashBars = useMemo(
    () =>
      summary.daily.map((d) => ({
        label: d.date.slice(5),
        net: d.net_egp,
      })),
    [summary.daily],
  );

  const pieData = useMemo(
    () =>
      Object.entries(summary.expenses_by_category)
        .map(([name, value]) => ({ name, value }))
        .filter((x) => x.value > 0),
    [summary.expenses_by_category],
  );

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-xl font-bold text-cb-text-strong">Analytics & charts</h2>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm">
          <h3 className="text-sm font-bold text-cb-text-strong">Revenue vs expenses</h3>
          <div className="mt-2 h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-cb-border/60" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--cb-text-muted)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--cb-text-muted)" />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#16a34a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#dc2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm">
          <h3 className="text-sm font-bold text-cb-text-strong">Profit trend</h3>
          <div className="mt-2 h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profitArea} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-cb-border/60" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--cb-text-muted)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--cb-text-muted)" />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="profit" name="Net" stroke="#4f46e5" fill="url(#profitFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm">
          <h3 className="text-sm font-bold text-cb-text-strong">Expense breakdown</h3>
          <div className="mt-2 h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm">
          <h3 className="text-sm font-bold text-cb-text-strong">Daily cash (net)</h3>
          <div className="mt-2 h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-cb-border/60" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--cb-text-muted)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--cb-text-muted)" />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="net" name="Net" radius={[4, 4, 0, 0]}>
                  {cashBars.map((e, i) => (
                    <Cell key={i} fill={e.net >= 0 ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
