import { eachDayOfInterval, formatISO } from "date-fns";
import type {
  DailyFinancialPoint,
  ExpenseRow,
  LedgerEntry,
  FinancialComparisonBlock,
  FinancialSummaryResponse,
} from "@/lib/financial/types";

export type OrderPaidRow = {
  total_egp: number | string | null;
  created_at: string;
  payment_status: string | null;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function dayKeyFromIso(iso: string): string {
  return iso.slice(0, 10);
}

export function buildFinancialPayload(params: {
  preset: FinancialSummaryResponse["range"]["preset"];
  from: Date;
  to: Date;
  ordersPaid: OrderPaidRow[];
  expenses: ExpenseRow[];
  compare: boolean;
  prevBlock?: FinancialComparisonBlock | null;
}): FinancialSummaryResponse {
  const { preset, from, to, ordersPaid, expenses, compare, prevBlock } = params;

  const revenueByDay = new Map<string, number>();
  for (const o of ordersPaid) {
    if ((o.payment_status ?? "").toLowerCase() !== "paid") continue;
    const k = dayKeyFromIso(o.created_at);
    revenueByDay.set(k, (revenueByDay.get(k) ?? 0) + num(o.total_egp));
  }

  const expensesByDay = new Map<string, number>();
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const k = e.expense_date.slice(0, 10);
    const amt = num(e.amount_egp);
    expensesByDay.set(k, (expensesByDay.get(k) ?? 0) + amt);
    const cat = e.category || "other";
    byCategory[cat] = (byCategory[cat] ?? 0) + amt;
  }

  const days = eachDayOfInterval({ start: from, end: to });
  const daily: DailyFinancialPoint[] = days.map((d) => {
    const key = formatISO(d, { representation: "date" });
    const revenue_egp = Math.round((revenueByDay.get(key) ?? 0) * 100) / 100;
    const expenses_egp = Math.round((expensesByDay.get(key) ?? 0) * 100) / 100;
    return {
      date: key,
      revenue_egp,
      expenses_egp,
      net_egp: Math.round((revenue_egp - expenses_egp) * 100) / 100,
    };
  });

  const revenue_egp = daily.reduce((s, d) => s + d.revenue_egp, 0);
  const expenses_egp = daily.reduce((s, d) => s + d.expenses_egp, 0);
  const net_egp = Math.round((revenue_egp - expenses_egp) * 100) / 100;
  const profit_margin_pct =
    revenue_egp <= 0 ? 0 : Math.round((net_egp / revenue_egp) * 10_000) / 100;

  const ledger: LedgerEntry[] = [];

  for (const d of daily) {
    if (d.revenue_egp > 0) {
      ledger.push({
        id: `income-${d.date}`,
        ledger_date: d.date,
        type: "income",
        category: "Paid orders",
        title: "Daily sales (paid)",
        amount_egp: d.revenue_egp,
        status: "posted",
        notes: "Aggregated from orders with payment_status=paid",
        source: "order_day",
      });
    }
  }

  for (const e of expenses) {
    ledger.push({
      id: e.id,
      ledger_date: e.expense_date.slice(0, 10),
      type: "expense",
      category: e.category,
      title: e.title,
      amount_egp: num(e.amount_egp),
      status: "posted",
      notes: e.notes,
      source: "expense",
    });
  }

  ledger.sort((a, b) => {
    const dt = b.ledger_date.localeCompare(a.ledger_date);
    if (dt !== 0) return dt;
    return a.type === "income" ? 1 : -1;
  });

  const paid_orders_count = ordersPaid.filter(
    (o) => (o.payment_status ?? "").toLowerCase() === "paid",
  ).length;

  return {
    range: {
      preset,
      from: from.toISOString(),
      to: to.toISOString(),
      days: daily.length,
    },
    kpis: {
      revenue_egp,
      expenses_egp,
      net_egp,
      profit_margin_pct,
      cash_flow_egp: net_egp,
      paid_orders_count,
    },
    comparison: compare ? prevBlock ?? null : null,
    daily,
    expenses_by_category: byCategory,
    expenses,
    ledger: ledger.slice(0, 400),
    meta: { fetched_at: new Date().toISOString() },
  };
}

export function summarizeOrdersForRange(
  orders: OrderPaidRow[],
  from: Date,
  to: Date,
): { revenue: number; expenses: number } {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  let revenue = 0;
  for (const o of orders) {
    const t = new Date(o.created_at).getTime();
    if (t < fromMs || t > toMs) continue;
    if ((o.payment_status ?? "").toLowerCase() !== "paid") continue;
    revenue += num(o.total_egp);
  }
  return { revenue: Math.round(revenue * 100) / 100, expenses: 0 };
}

export function summarizeExpensesForRange(
  expenses: ExpenseRow[],
  from: Date,
  to: Date,
): number {
  const fromKey = from.toISOString().slice(0, 10);
  const toKey = to.toISOString().slice(0, 10);
  let s = 0;
  for (const e of expenses) {
    const k = e.expense_date.slice(0, 10);
    if (k < fromKey || k > toKey) continue;
    s += num(e.amount_egp);
  }
  return Math.round(s * 100) / 100;
}

export function buildComparisonBlock(
  label: string,
  revenue: number,
  expenses: number,
): FinancialComparisonBlock {
  return {
    label,
    revenue_egp: revenue,
    expenses_egp: expenses,
    net_egp: Math.round((revenue - expenses) * 100) / 100,
  };
}
