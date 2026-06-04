import type { TrainingIntent } from "@/lib/mr-brownie/training/types";

const RULES: Array<{ intent: TrainingIntent; patterns: RegExp[] }> = [
  {
    intent: "gift_request",
    patterns: [/هدي|هدية|بوكس|صندوق|gift|present|occasion/i],
  },
  {
    intent: "delivery_faq",
    patterns: [/توصيل|شحن|delivery|ship|when.*arrive/i],
  },
  {
    intent: "complaint",
    patterns: [/مشكلة|بايظ|تالف|غلط|return|refund|شكوى|وصل.*(بايظ|تالف)|متضرر/i],
  },
  {
    intent: "order_status",
    patterns: [/فين.*(أوردر|طلب)|أين.*طلب|track.*order|order status|حالة الطلب/i],
  },
  {
    intent: "cart_help",
    patterns: [/سلة|cart|checkout/i],
  },
  {
    intent: "pairing",
    patterns: [/قهوة|coffee|مشروب/i],
  },
  {
    intent: "budget",
    patterns: [/جنيه|ميزانية|budget|egp|\d+\s*(جنيه|egp)/i],
  },
  {
    intent: "product_browse",
    patterns: [/كوكيز|منتج|product|shop|أحسن|best|flavor/i],
  },
  {
    intent: "greeting",
    patterns: [/^(مرحب|أهلا|هلا|hello|hi)\b/i],
  },
];

export function detectTrainingIntent(message: string): TrainingIntent {
  const text = message.trim();
  if (!text) return "general";
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.intent;
  }
  return "general";
}
