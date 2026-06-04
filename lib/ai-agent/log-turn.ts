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
  pageIntent?: string;
  pathname?: string;
  locale?: string;
  quality?: ResponseQualityReport;
  sessionId?: string;
  clerkUserId?: string | null;
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
    page_intent: input.pageIntent ?? null,
    pathname: input.pathname?.slice(0, 500) ?? null,
    locale: input.locale ?? null,
    quality_score: input.quality?.score ?? null,
    quality_issues,
    session_id: input.sessionId ?? input.agentId,
    clerk_user_id: input.clerkUserId ?? null,
    guest_session_id: input.guestSessionId ?? null,
    catalog_total: input.catalogTotal ?? null,
  });

  if (error) {
    console.error(`[agent-turn-log:${input.agentId}] insert failed`, error);
  }
}
