import { AI_AGENT_IDS } from "@/lib/ai-agent/agents";
import { logAgentTurn } from "@/lib/ai-agent/log-turn";
import type { PersonalityMode } from "@/lib/mr-brownie/brain/personality-router";
import type { ResponseQualityReport } from "@/lib/mr-brownie/brain/response-optimizer";

/** @deprecated استخدم logAgentTurn — يُحتفظ بالاسم للتوافق */
export async function logMrBrownieTurn(input: {
  userMessage: string;
  assistantMessage: string;
  intent?: string;
  personalityMode?: PersonalityMode;
  pageIntent?: string;
  pathname?: string;
  locale?: string;
  quality?: ResponseQualityReport;
  sessionId?: string;
  clerkUserId?: string | null;
  guestSessionId?: string | null;
  catalogTotal?: number;
}): Promise<void> {
  return logAgentTurn({
    agentId: AI_AGENT_IDS.MR_BROWNIE,
    ...input,
  });
}
