import type { AiAgentId } from "@/lib/ai-agent/agents";
import { runSupervisorPipeline } from "@/lib/mr-brownie/brain/supervisor";
import type { CommerceIntent } from "@/lib/mr-brownie/brain/intent-engine";
import type { PersonalityMode } from "@/lib/mr-brownie/brain/personality-router";
import type { ResponseQualityReport } from "@/lib/mr-brownie/brain/response-quality";
import { logAgentTurn } from "@/lib/ai-agent/log-turn";

export type AgentTurnLogMeta = {
  intent: string;
  confidencePct: number;
  personalityMode?: PersonalityMode | string;
  pageIntent?: string;
  pathname?: string;
  locale?: string;
  catalogTotal?: number;
  clerkUserId?: string | null;
  guestSessionId?: string | null;
  sessionId?: string;
};

/**
 * Generator → Critic → Coach — مشترك لكل مساعدي الموقع.
 */
export async function finalizeAgentResponse(params: {
  agentId: AiAgentId;
  draft: string;
  userMessage: string;
  intent: CommerceIntent | string;
  confidencePct: number;
  locale?: "ar" | "en" | "auto";
  catalogTotal?: number;
  forceClarify?: boolean;
  /** تسجيل الجودة (اختياري — مثلاً بعد stream) */
  turnLog?: AgentTurnLogMeta;
}): Promise<{
  text: string;
  quality: ResponseQualityReport;
  coached: boolean;
  supervisorAction: "pass" | "coach_revise" | "clarification_override";
}> {
  const locale = params.locale ?? "auto";
  const intent =
    typeof params.intent === "string"
      ? (params.intent as CommerceIntent)
      : params.intent;

  const result = await runSupervisorPipeline({
    draft: params.draft,
    userMessage: params.userMessage,
    intent,
    confidencePct: params.confidencePct,
    locale,
    catalogTotal: params.catalogTotal,
    forceClarify: params.forceClarify,
  });

  if (params.turnLog) {
    void logAgentTurn({
      agentId: params.agentId,
      userMessage: params.userMessage,
      assistantMessage: result.text,
      intent: params.turnLog.intent,
      personalityMode: params.turnLog.personalityMode,
      pageIntent: params.turnLog.pageIntent,
      pathname: params.turnLog.pathname,
      locale: params.turnLog.locale,
      quality: {
        score: result.quality.score,
        pass: result.quality.pass,
        issues: result.coached
          ? [...result.quality.issues, "coach_revised"]
          : result.quality.issues,
        grade: result.quality.grade,
      },
      clerkUserId: params.turnLog.clerkUserId,
      guestSessionId: params.turnLog.guestSessionId,
      sessionId: params.turnLog.sessionId,
      catalogTotal: params.turnLog.catalogTotal,
    });
  }

  return {
    text: result.text,
    quality: {
      score: result.quality.score,
      pass: result.quality.pass,
      issues: result.quality.issues,
      grade: result.quality.grade,
    },
    coached: result.coached,
    supervisorAction: result.supervisor_action,
  };
}
