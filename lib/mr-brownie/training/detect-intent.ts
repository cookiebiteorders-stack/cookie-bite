import { understandUserMessage } from "@/lib/mr-brownie/brain/message-understanding";
import type { TrainingIntent } from "@/lib/mr-brownie/training/types";

/** يُرجع أعلى نية بعد تسجيل weighted — بديل أدق من أول regex يطابق */
export function detectTrainingIntent(message: string): TrainingIntent {
  return understandUserMessage({ message }).top_intent;
}

/** للاختبارات والتحليل — النية + الثقة */
export function detectTrainingIntentDetailed(message: string): {
  intent: TrainingIntent;
  confidence_pct: number;
  scores: Array<{ intent: TrainingIntent; score: number }>;
} {
  const u = understandUserMessage({ message });
  return {
    intent: u.top_intent,
    confidence_pct: u.confidence_pct,
    scores: u.intent_scores,
  };
}
