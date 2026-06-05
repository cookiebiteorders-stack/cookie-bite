import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type MrBrownieConversationRow = {
  id: string;
  created_at: string;
  user_message: string;
  assistant_message: string;
  intent: string | null;
  active_persona: string | null;
  sentiment_score: number | null;
  confidence_pct: number | null;
  quality_score: number | null;
  pathname: string | null;
  locale: string | null;
  clerk_user_id: string | null;
};

export async function fetchMrBrownieConversations(params: {
  days?: number;
  intent?: string;
  persona?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: MrBrownieConversationRow[]; total: number }> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return { rows: [], total: 0 };

  const days = Math.min(90, Math.max(1, params.days ?? 30));
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const limit = Math.min(100, Math.max(10, params.limit ?? 40));
  const offset = Math.max(0, params.offset ?? 0);

  let query = supabase
    .from("mr_brownie_turn_logs")
    .select(
      "id, created_at, user_message, assistant_message, intent, active_persona, sentiment_score, confidence_pct, quality_score, pathname, locale, clerk_user_id",
      { count: "exact" },
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.intent?.trim()) {
    query = query.eq("intent", params.intent.trim());
  }
  if (params.persona === "mr_brownie" || params.persona === "mrs_cookie") {
    query = query.eq("active_persona", params.persona);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[admin/conversations]", error);
    return { rows: [], total: 0 };
  }

  return {
    rows: (data ?? []) as MrBrownieConversationRow[],
    total: count ?? 0,
  };
}

export function conversationsToCsv(rows: MrBrownieConversationRow[]): string {
  const header =
    "created_at,intent,persona,sentiment,confidence,quality,user_message,assistant_message,pathname,locale,clerk_user_id";
  const lines = rows.map((r) => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [
      r.created_at,
      r.intent ?? "",
      r.active_persona ?? "",
      r.sentiment_score ?? "",
      r.confidence_pct ?? "",
      r.quality_score ?? "",
      esc(r.user_message.slice(0, 500)),
      esc(r.assistant_message.slice(0, 500)),
      r.pathname ?? "",
      r.locale ?? "",
      r.clerk_user_id ?? "",
    ].join(",");
  });
  return [header, ...lines].join("\n");
}
