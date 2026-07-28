import type { AiAgentId } from "@/lib/ai-agent/agents";
import type { PersonalityMode } from "@/lib/mr-brownie/brain/personality-router";
import type { ResponseQualityReport } from "@/lib/mr-brownie/brain/response-quality";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export async function logAgentTurn(input: {
  agentId: AiAgentId;
  userMessage: string;
  assistantMessage: string;
  intent?: string;
  personalityMode?: PersonalityMode | string;
  activePersona?: "mr_brownie" | "mrs_cookie";
  promptVariant?: "a" | "b";
  ragSource?: "vector" | "keyword" | "none" | null;
  ragHitCount?: number;
  sentimentScore?: number;
  confidencePct?: number;
  pageIntent?: string;
  pathname?: string;
  locale?: string;
  quality?: ResponseQualityReport;
  sessionId?: string;
  supabaseUserId?: string | null;
  guestSessionId?: string | null;
  catalogTotal?: number;
}): Promise<void> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return;

  const quality_issues = input.quality?.issues?.length
    ? {
        agent_id: input.agentId,
        issues: input.quality.issues,
        grade: input.quality.grade,
      }
    : { agent_id: input.agentId };

  const { error } = await supabase.from("mr_brownie_turn_logs").insert({
    user_message: input.userMessage.slice(0, 12000),
    assistant_message: input.assistantMessage.slice(0, 12000),
    intent: input.intent ?? null,
    personality_mode:
      typeof input.personalityMode === "string" &&
      ["friendly", "sales", "support"].includes(input.personalityMode)
        ? input.personalityMode
        : null,
    active_persona:
      input.activePersona === "mr_brownie" || input.activePersona === "mrs_cookie"
        ? input.activePersona
        : null,
    prompt_variant:
      input.promptVariant === "a" || input.promptVariant === "b"
        ? input.promptVariant
        : null,
    rag_source:
      input.ragSource === "vector" ||
      input.ragSource === "keyword" ||
      input.ragSource === "none"
        ? input.ragSource
        : null,
    rag_hit_count:
      typeof input.ragHitCount === "number" ? input.ragHitCount : null,
    sentiment_score:
      typeof input.sentimentScore === "number" ? input.sentimentScore : null,
    confidence_pct:
      typeof input.confidencePct === "number" ? input.confidencePct : null,
    page_intent: input.pageIntent ?? null,
    pathname: input.pathname?.slice(0, 500) ?? null,
    locale: input.locale ?? null,
    quality_score: input.quality?.score ?? null,
    quality_issues,
    session_id: input.sessionId ?? input.agentId,
    supabase_user_id: input.supabaseUserId ?? null,
    guest_session_id: input.guestSessionId ?? null,
    catalog_total: input.catalogTotal ?? null,
  });

  if (error) {
    console.error(`[agent-turn-log:${input.agentId}] insert failed`, error);
  }
}
