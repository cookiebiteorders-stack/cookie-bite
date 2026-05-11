import type {
  GatewayHealthCard,
  PaymentDailyTrend,
  PaymentMethodMix,
  PaymentTransactionRow,
} from "@/lib/payments/payment-summary-types";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** آخر 14 يوماً (حتى اليوم) — تجميع مدفوعات/فشل/إيراد */
export function buildDailyTrend(rows: PaymentTransactionRow[]): PaymentDailyTrend[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(dayKey(d));
  }
  const map = new Map<string, { paid: number; failed: number; revenue_egp: number }>();
  for (const k of keys) map.set(k, { paid: 0, failed: 0, revenue_egp: 0 });

  for (const r of rows) {
    const k = dayKey(new Date(r.created_at));
    if (!map.has(k)) continue;
    const b = map.get(k)!;
    const st = (r.payment_status ?? "").toLowerCase();
    if (st === "paid") {
      b.paid++;
      b.revenue_egp += Number(r.total_egp || 0);
    } else if (st === "failed") {
      b.failed++;
    }
  }
  return keys.map((date) => {
    const v = map.get(date)!;
    return { date, paid: v.paid, failed: v.failed, revenue_egp: Math.round(v.revenue_egp * 100) / 100 };
  });
}

export function buildMethodMix(rows: PaymentTransactionRow[]): PaymentMethodMix[] {
  const map = new Map<string, { total: number; paid: number; failed: number }>();
  for (const r of rows) {
    const m = (r.payment_method ?? "unspecified").trim() || "unspecified";
    const cur = map.get(m) ?? { total: 0, paid: 0, failed: 0 };
    cur.total++;
    const st = (r.payment_status ?? "").toLowerCase();
    if (st === "paid") cur.paid++;
    if (st === "failed") cur.failed++;
    map.set(m, cur);
  }
  return [...map.entries()]
    .map(([method, v]) => ({ method, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
}

function syntheticLatency(successPct: number): number {
  const fail = Math.max(0, 100 - successPct);
  return Math.round(110 + fail * 6 + (fail > 15 ? 220 : 0));
}

function syntheticUptime(successPct: number): number {
  return Math.min(99.99, Math.max(90, 92 + successPct * 0.07));
}

function healthStatus(successPct: number, volume: number): GatewayHealthCard["status"] {
  if (volume === 0) return "healthy";
  if (successPct >= 92) return "healthy";
  if (successPct >= 78) return "degraded";
  return "down";
}

function gatewayBucket(r: PaymentTransactionRow): "paymob" | "wallet" | "manual" {
  const pm = (r.payment_method ?? "").toLowerCase();
  if (/vodafone|etisalat|orange|we pay|meeza|meza|mobile wallet/i.test(pm)) return "wallet";
  if (
    r.paymob_transaction_id ||
    r.paymob_accept_order_id != null ||
    /card|online|apple|google|instapay|fawry|iframe|accept/i.test(pm)
  ) {
    return "paymob";
  }
  if (/cash|cod|transfer|manual|bank|تحويل|نقد/i.test(pm)) return "manual";
  return "paymob";
}

/** مجموعات بسيطة لمراقبة «البوابات» من بيانات الطلبات الفعلية */
export function buildGatewayHealth(rows: PaymentTransactionRow[]): GatewayHealthCard[] {
  const defs = [
    { id: "paymob", label: "Paymob Accept", key: "paymob" as const },
    { id: "wallet", label: "Mobile wallets", key: "wallet" as const },
    { id: "manual", label: "Manual / COD", key: "manual" as const },
  ];

  return defs.map(({ id, label, key }) => {
    const subset = rows.filter((r) => gatewayBucket(r) === key);
    const volume = subset.length;
    const paid = subset.filter((r) => (r.payment_status ?? "").toLowerCase() === "paid").length;
    const success_pct =
      volume === 0 ? 100 : Math.round((paid / volume) * 1000) / 10;
    return {
      id,
      label,
      status: healthStatus(success_pct, volume),
      success_pct,
      latency_ms: syntheticLatency(success_pct),
      uptime_pct: syntheticUptime(success_pct),
      volume,
    };
  });
}
