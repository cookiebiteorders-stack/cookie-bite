/** شكل استجابة GET /api/admin/payments/summary */
export type PaymentTransactionRow = {
  id: string;
  order_code: string | null;
  guest_email: string | null;
  user_id: string | null;
  total_egp: number;
  payment_status: string;
  payment_method: string | null;
  paymob_transaction_id: string | null;
  paymob_accept_order_id: number | null;
  created_at: string;
};

export type PaymentDailyTrend = {
  date: string;
  paid: number;
  failed: number;
  revenue_egp: number;
};

export type PaymentMethodMix = {
  method: string;
  total: number;
  paid: number;
  failed: number;
};

export type GatewayHealthCard = {
  id: string;
  label: string;
  status: "healthy" | "degraded" | "down";
  success_pct: number;
  latency_ms: number;
  uptime_pct: number;
  volume: number;
};

export type PaymentSummaryResponse = {
  kpis: {
    total_captured_egp: number;
    paid_count: number;
    failed_count: number;
    refunded_count: number;
    unpaid_count: number;
    total_transactions: number;
    success_rate_pct: number;
    avg_paid_ticket_egp: number;
    rows_with_gateway_tx: number;
  };
  by_status: Record<string, number>;
  daily_trend: PaymentDailyTrend[];
  method_mix: PaymentMethodMix[];
  gateway_health: GatewayHealthCard[];
  recent: PaymentTransactionRow[];
  meta: { fetched_at: string; row_count: number };
};
