import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type MrBrownieWeeklyReport = {
  period_days: number;
  generated_at: string;
  summary: {
    turns: number;
    feedback_up: number;
    feedback_down: number;
    satisfaction_pct: number | null;
    rag_hit_rate_pct: number | null;
    knowledge_gaps: number;
    complaint_turns: number;
    weak_turns: number;
  };
  top_intents: Array<{ intent: string; count: number }>;
  top_knowledge_gaps: Array<{ query_text: string; occurrence_count: number }>;
  top_complaint_samples: Array<{ user_message: string; created_at: string }>;
  suggested_actions: string[];
};

export async function buildMrBrownieWeeklyReport(
  days = 7,
): Promise<MrBrownieWeeklyReport | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;

  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const [turnsRes, feedbackRes, gapsRes] = await Promise.all([
    supabase
      .from("mr_brownie_turn_logs")
      .select(
        "intent, user_message, quality_score, rag_source, created_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(800),
    supabase
      .from("mr_brownie_feedback")
      .select("rating")
      .gte("created_at", since),
    supabase
      .from("mr_brownie_knowledge_gaps")
      .select("query_text, occurrence_count")
      .eq("resolved", false)
      .order("occurrence_count", { ascending: false })
      .limit(10),
  ]);

  const turns = turnsRes.data ?? [];
  const feedback = feedbackRes.data ?? [];
  const up = feedback.filter((f) => f.rating === 1).length;
  const down = feedback.filter((f) => f.rating === -1).length;
  const satDenom = up + down;

  let vector = 0;
  let keyword = 0;
  let misses = 0;
  let weak = 0;
  let complaints = 0;
  const intentMap = new Map<string, number>();

  for (const t of turns) {
    const intent = t.intent ?? "unknown";
    intentMap.set(intent, (intentMap.get(intent) ?? 0) + 1);
    if (t.rag_source === "vector") vector += 1;
    else if (t.rag_source === "keyword") keyword += 1;
    else if (t.rag_source === "none") misses += 1;
    if (typeof t.quality_score === "number" && t.quality_score < 65) weak += 1;
    if (intent === "complaint") complaints += 1;
  }

  const ragTotal = vector + keyword + misses;
  const rag_hit_rate_pct =
    ragTotal > 0 ? Math.round(((vector + keyword) / ragTotal) * 100) : null;

  const top_knowledge_gaps = (gapsRes.data ?? []).map((g) => ({
    query_text: String(g.query_text),
    occurrence_count: Number(g.occurrence_count) || 1,
  }));

  const top_complaint_samples = turns
    .filter((t) => t.intent === "complaint")
    .slice(0, 5)
    .map((t) => ({
      user_message: String(t.user_message).slice(0, 200),
      created_at: String(t.created_at),
    }));

  const suggested_actions: string[] = [];
  if (top_knowledge_gaps.length >= 3) {
    suggested_actions.push("Add FAQ entries for top knowledge gaps, then reindex RAG.");
  }
  if (complaints >= 2) {
    suggested_actions.push("Review complaint samples — tighten support overlay in prompts.");
  }
  if (weak >= 5) {
    suggested_actions.push("Run npm run mr-brownie:auto-improve on weak turn logs.");
  }
  if (rag_hit_rate_pct != null && rag_hit_rate_pct < 75) {
    suggested_actions.push("RAG hit rate below 75% — reindex products + FAQ.");
  }

  return {
    period_days: days,
    generated_at: new Date().toISOString(),
    summary: {
      turns: turns.length,
      feedback_up: up,
      feedback_down: down,
      satisfaction_pct: satDenom > 0 ? Math.round((up / satDenom) * 100) : null,
      rag_hit_rate_pct,
      knowledge_gaps: top_knowledge_gaps.length,
      complaint_turns: complaints,
      weak_turns: weak,
    },
    top_intents: [...intentMap.entries()]
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    top_knowledge_gaps,
    top_complaint_samples,
    suggested_actions,
  };
}
