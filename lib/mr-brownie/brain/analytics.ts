import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type MrBrownieAnalyticsSnapshot = {
  period_days: number;
  totals: {
    turns: number;
    feedback_up: number;
    feedback_down: number;
    satisfaction_pct: number | null;
    avg_quality_score: number | null;
  };
  intents: Array<{ intent: string; count: number; weak_count: number }>;
  quality_issues: Array<{ issue: string; count: number }>;
  weak_samples: Array<{
    user_message: string;
    assistant_message: string;
    score: number | null;
    intent: string | null;
    created_at: string;
  }>;
  suggested_rules: string[];
};

export async function fetchMrBrownieAnalytics(
  days = 30,
): Promise<MrBrownieAnalyticsSnapshot | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;

  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const [turnsRes, feedbackRes] = await Promise.all([
    supabase
      .from("mr_brownie_turn_logs")
      .select("intent, quality_score, quality_issues, user_message, assistant_message, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("mr_brownie_feedback")
      .select("rating, intent")
      .gte("created_at", since),
  ]);

  const turns = turnsRes.data ?? [];
  const feedback = feedbackRes.data ?? [];
  const up = feedback.filter((f) => f.rating === 1).length;
  const down = feedback.filter((f) => f.rating === -1).length;
  const satDenom = up + down;
  const satisfaction_pct = satDenom > 0 ? Math.round((up / satDenom) * 100) : null;

  const scores = turns
    .map((t) => t.quality_score)
    .filter((s): s is number => typeof s === "number");
  const avg_quality_score = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  const intentMap = new Map<string, { count: number; weak_count: number }>();
  const issueMap = new Map<string, number>();

  for (const t of turns) {
    const key = t.intent ?? "unknown";
    const row = intentMap.get(key) ?? { count: 0, weak_count: 0 };
    row.count += 1;
    if (typeof t.quality_score === "number" && t.quality_score < 65) {
      row.weak_count += 1;
    }
    intentMap.set(key, row);

    const issues = (t.quality_issues as { issues?: string[] } | null)?.issues ?? [];
    for (const issue of issues) {
      issueMap.set(issue, (issueMap.get(issue) ?? 0) + 1);
    }
  }

  const intents = [...intentMap.entries()]
    .map(([intent, v]) => ({ intent, ...v }))
    .sort((a, b) => b.count - a.count);

  const quality_issues = [...issueMap.entries()]
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count);

  const weak_samples = turns
    .filter((t) => typeof t.quality_score === "number" && t.quality_score < 65)
    .slice(0, 8)
    .map((t) => ({
      user_message: String(t.user_message).slice(0, 200),
      assistant_message: String(t.assistant_message).slice(0, 200),
      score: t.quality_score,
      intent: t.intent,
      created_at: String(t.created_at),
    }));

  const suggested_rules: string[] = [];
  const topIssue = quality_issues[0];
  if (topIssue?.issue === "missing_follow_up") {
    suggested_rules.push(
      "When quality drops on follow-up: enforce ending question in every shopping reply.",
    );
  }
  if (topIssue?.issue === "missing_suggestion") {
    suggested_rules.push("When users browse: always name at least one SKU from tool_results.");
  }
  if (topIssue?.issue === "too_short") {
    suggested_rules.push("Expand replies under 40 chars with context + CTA.");
  }
  const confusedIntent = intents.find((i) => i.intent === "general" && i.count > 5);
  if (confusedIntent) {
    suggested_rules.push(
      "High general-intent volume: use smart_fallback choices before answering.",
    );
  }

  return {
    period_days: days,
    totals: {
      turns: turns.length,
      feedback_up: up,
      feedback_down: down,
      satisfaction_pct,
      avg_quality_score,
    },
    intents,
    quality_issues,
    weak_samples,
    suggested_rules,
  };
}
