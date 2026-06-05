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
  personas: Array<{
    persona: string;
    count: number;
    avg_sentiment: number | null;
  }>;
  avg_sentiment: number | null;
  /** اختبار A/B لبرومبت Mr. Brownie — أداء كل variant */
  prompt_variants: Array<{
    variant: string;
    count: number;
    avg_quality: number | null;
    avg_sentiment: number | null;
  }>;
  /** قمع تفاعل المحادثة (من سجلات الأدوار) */
  funnel: {
    turns: number;
    product_intent_turns: number;
    positive_sentiment_turns: number;
    weak_turns: number;
  };
  /** أداء RAG من سجلات الأدوار */
  rag: {
    vector_hits: number;
    keyword_hits: number;
    misses: number;
    hit_rate_pct: number | null;
  };
  /** استعلامات بلا نتائج RAG — للمراجعة */
  knowledge_gaps: Array<{
    id: string;
    query_text: string;
    locale: string | null;
    occurrence_count: number;
    last_seen_at: string;
  }>;
};

export async function fetchMrBrownieAnalytics(
  days = 30,
): Promise<MrBrownieAnalyticsSnapshot | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;

  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const [turnsRes, feedbackRes, gapsRes] = await Promise.all([
    supabase
      .from("mr_brownie_turn_logs")
      .select(
        "intent, quality_score, quality_issues, user_message, assistant_message, created_at, active_persona, sentiment_score, prompt_variant, rag_source, rag_hit_count",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("mr_brownie_feedback")
      .select("rating, intent")
      .gte("created_at", since),
    supabase
      .from("mr_brownie_knowledge_gaps")
      .select("id, query_text, locale, occurrence_count, last_seen_at")
      .eq("resolved", false)
      .order("occurrence_count", { ascending: false })
      .limit(10),
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

  const personaMap = new Map<string, { count: number; sentimentSum: number; sentimentN: number }>();
  let sentimentSum = 0;
  let sentimentN = 0;

  for (const t of turns) {
    const p = t.active_persona ?? "unknown";
    const row = personaMap.get(p) ?? { count: 0, sentimentSum: 0, sentimentN: 0 };
    row.count += 1;
    if (typeof t.sentiment_score === "number") {
      row.sentimentSum += Number(t.sentiment_score);
      row.sentimentN += 1;
      sentimentSum += Number(t.sentiment_score);
      sentimentN += 1;
    }
    personaMap.set(p, row);
  }

  const personas = [...personaMap.entries()]
    .map(([persona, v]) => ({
      persona,
      count: v.count,
      avg_sentiment:
        v.sentimentN > 0
          ? Math.round((v.sentimentSum / v.sentimentN) * 100) / 100
          : null,
    }))
    .sort((a, b) => b.count - a.count);

  const avg_sentiment =
    sentimentN > 0 ? Math.round((sentimentSum / sentimentN) * 100) / 100 : null;

  // اختبار A/B: تجميع حسب prompt_variant
  const variantMap = new Map<
    string,
    { count: number; qSum: number; qN: number; sSum: number; sN: number }
  >();
  const PRODUCT_INTENTS = new Set([
    "product_browse",
    "recommendation",
    "fast_gift",
    "gift_request",
    "custom_request",
  ]);
  let product_intent_turns = 0;
  let positive_sentiment_turns = 0;
  let weak_turns = 0;
  let vector_hits = 0;
  let keyword_hits = 0;
  let rag_misses = 0;

  for (const t of turns) {
    const v = t.prompt_variant === "b" ? "b" : t.prompt_variant === "a" ? "a" : null;
    if (v) {
      const row = variantMap.get(v) ?? { count: 0, qSum: 0, qN: 0, sSum: 0, sN: 0 };
      row.count += 1;
      if (typeof t.quality_score === "number") {
        row.qSum += t.quality_score;
        row.qN += 1;
      }
      if (typeof t.sentiment_score === "number") {
        row.sSum += Number(t.sentiment_score);
        row.sN += 1;
      }
      variantMap.set(v, row);
    }
    if (t.intent && PRODUCT_INTENTS.has(String(t.intent))) product_intent_turns += 1;
    if (typeof t.sentiment_score === "number" && Number(t.sentiment_score) > 0) {
      positive_sentiment_turns += 1;
    }
    if (typeof t.quality_score === "number" && t.quality_score < 65) weak_turns += 1;
    if (t.rag_source === "vector") vector_hits += 1;
    else if (t.rag_source === "keyword") keyword_hits += 1;
    else if (t.rag_source === "none") rag_misses += 1;
  }

  const ragAttempts = vector_hits + keyword_hits + rag_misses;
  const hit_rate_pct =
    ragAttempts > 0
      ? Math.round(((vector_hits + keyword_hits) / ragAttempts) * 100)
      : null;

  const knowledge_gaps = (gapsRes.data ?? []).map((g) => ({
    id: String(g.id),
    query_text: String(g.query_text),
    locale: g.locale ? String(g.locale) : null,
    occurrence_count: Number(g.occurrence_count) || 1,
    last_seen_at: String(g.last_seen_at),
  }));

  const prompt_variants = [...variantMap.entries()]
    .map(([variant, v]) => ({
      variant,
      count: v.count,
      avg_quality: v.qN > 0 ? Math.round(v.qSum / v.qN) : null,
      avg_sentiment: v.sN > 0 ? Math.round((v.sSum / v.sN) * 100) / 100 : null,
    }))
    .sort((a, b) => a.variant.localeCompare(b.variant));

  const funnel = {
    turns: turns.length,
    product_intent_turns,
    positive_sentiment_turns,
    weak_turns,
  };

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
  if (rag_misses >= 3) {
    suggested_rules.push(
      "RAG misses detected — review knowledge_gaps in admin and reindex FAQ/products.",
    );
  }
  if (hit_rate_pct !== null && hit_rate_pct < 70) {
    suggested_rules.push(
      `RAG hit rate ${hit_rate_pct}% — add FAQ entries or run pgvector reindex.`,
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
    personas,
    avg_sentiment,
    prompt_variants,
    funnel,
    rag: {
      vector_hits,
      keyword_hits,
      misses: rag_misses,
      hit_rate_pct,
    },
    knowledge_gaps,
  };
}
