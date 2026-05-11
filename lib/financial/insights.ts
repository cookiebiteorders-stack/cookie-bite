import type { DailyFinancialPoint, FinancialComparisonBlock } from "@/lib/financial/types";

export type FinancialInsight = {
  id: string;
  tone: "positive" | "neutral" | "warning";
  title: string;
  detail: string;
};

function bestRevenueDay(daily: DailyFinancialPoint[]): string | null {
  if (!daily.length) return null;
  let max = -1;
  let day = "";
  for (const d of daily) {
    if (d.revenue_egp > max) {
      max = d.revenue_egp;
      day = d.date;
    }
  }
  if (max <= 0) return null;
  const dt = new Date(day + "T12:00:00Z");
  return dt.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function buildFinancialInsights(
  daily: DailyFinancialPoint[],
  comparison: FinancialComparisonBlock | null,
  expensesTotal: number,
): FinancialInsight[] {
  const out: FinancialInsight[] = [];

  if (comparison && comparison.expenses_egp > 0 && expensesTotal >= 0) {
    const delta =
      ((expensesTotal - comparison.expenses_egp) / comparison.expenses_egp) * 100;
    if (delta > 5) {
      out.push({
        id: "exp-up",
        tone: "warning",
        title: "Expenses moved up vs last period",
        detail: `Roughly ${delta.toFixed(0)}% higher spend than the comparison window.`,
      });
    } else if (delta < -5) {
      out.push({
        id: "exp-down",
        tone: "positive",
        title: "Expenses cooled vs last period",
        detail: `About ${Math.abs(delta).toFixed(0)}% lower spend than the comparison window.`,
      });
    }
  }

  const best = bestRevenueDay(daily);
  if (best) {
    out.push({
      id: "best-day",
      tone: "positive",
      title: "Strongest revenue day",
      detail: `Highest paid-day total landed on ${best}.`,
    });
  }

  const last7 = daily.slice(-7);
  const avgNet =
    last7.length === 0
      ? 0
      : last7.reduce((s, d) => s + d.net_egp, 0) / last7.length;
  if (avgNet > 0 && last7.length >= 3) {
    const projected = avgNet * 30;
    out.push({
      id: "proj",
      tone: "neutral",
      title: "Projected net (30d heuristic)",
      detail: `If the last week repeats, net could land near EGP ${Math.round(projected).toLocaleString()} — not a forecast, just a pace check.`,
    });
  }

  if (!out.length) {
    out.push({
      id: "calm",
      tone: "neutral",
      title: "Stable window",
      detail: "No strong anomalies detected in this range — keep monitoring weekly trends.",
    });
  }

  return out.slice(0, 5);
}
