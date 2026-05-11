export type FinancialPreset = "today" | "week" | "month" | "custom";

export type ExpenseRow = {
  id: string;
  title: string;
  category: string;
  amount_egp: number;
  expense_date: string;
  notes: string | null;
  created_at?: string;
};

export type LedgerEntry = {
  id: string;
  ledger_date: string;
  type: "income" | "expense";
  category: string;
  title: string;
  amount_egp: number;
  status: "posted" | "pending";
  notes: string | null;
  source: "order_day" | "expense";
};

export type DailyFinancialPoint = {
  date: string;
  revenue_egp: number;
  expenses_egp: number;
  net_egp: number;
};

export type FinancialComparisonBlock = {
  revenue_egp: number;
  expenses_egp: number;
  net_egp: number;
  label: string;
};

export type FinancialSummaryResponse = {
  range: {
    preset: FinancialPreset;
    from: string;
    to: string;
    days: number;
  };
  kpis: {
    revenue_egp: number;
    expenses_egp: number;
    net_egp: number;
    profit_margin_pct: number;
    cash_flow_egp: number;
    paid_orders_count: number;
  };
  comparison: FinancialComparisonBlock | null;
  daily: DailyFinancialPoint[];
  expenses_by_category: Record<string, number>;
  expenses: ExpenseRow[];
  ledger: LedgerEntry[];
  meta: { fetched_at: string };
};
