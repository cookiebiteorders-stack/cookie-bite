import { buildSmartFallback } from "@/lib/mr-brownie/brain/intent-engine";
import type { CommerceIntent } from "@/lib/mr-brownie/brain/intent-engine";
import { coachReviseResponse } from "@/lib/mr-brownie/brain/response-optimizer";
import { runResponseCritic, type CriticVerdict } from "@/lib/mr-brownie/brain/response-critic";

export type SupervisorResult = {
  text: string;
  quality: CriticVerdict;
  coached: boolean;
  supervisor_action: "pass" | "coach_revise" | "clarification_override";
};

/**
 * AI Supervisor — يراجع الرد بعد التوليد (Generator + Critic + optional revise)
 */
export async function runSupervisorPipeline(params: {
  draft: string;
  userMessage: string;
  intent: CommerceIntent;
  confidencePct: number;
  locale: "ar" | "en" | "auto";
  catalogTotal?: number;
  forceClarify?: boolean;
}): Promise<SupervisorResult> {
  if (params.forceClarify || params.confidencePct < 35) {
    const clarification = buildSmartFallback(params.intent, params.locale);
    const quality = runResponseCritic(clarification, {
      catalogTotal: params.catalogTotal,
    });
    return {
      text: clarification,
      quality,
      coached: false,
      supervisor_action: "clarification_override",
    };
  }

  let text = params.draft.trim();
  let quality = runResponseCritic(text, { catalogTotal: params.catalogTotal });
  let coached = false;

  if (!quality.critic_pass) {
    const revised = await coachReviseResponse({
      draft: text,
      userMessage: params.userMessage,
      issues: quality.issues,
    });
    if (revised) {
      text = revised;
      quality = runResponseCritic(text, { catalogTotal: params.catalogTotal });
      coached = true;
    }
  }

  return {
    text,
    quality,
    coached,
    supervisor_action: coached ? "coach_revise" : "pass",
  };
}
