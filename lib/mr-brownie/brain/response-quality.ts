export type ResponseQualityReport = {
  score: number;
  pass: boolean;
  issues: string[];
  grade: "weak" | "good" | "excellent";
};

const MAX_LEN = 2400;
const MIN_LEN = 40;

function hasFollowUp(text: string): boolean {
  return /[؟?]/.test(text) || /\b(تحب|هل تريد|would you|do you want|أو)\b/i.test(text);
}

function hasSuggestion(text: string): boolean {
  return (
    /\b(اقترح|أنصح|جرب|شوف|browse|\/shop|\/gift|ممكن|try|suggest)\b/i.test(text) ||
    /[*•-]\s+\S/.test(text)
  );
}

/** Checklist جودة الرد — بدون استدعاء LLM */
export function scoreAssistantResponse(
  reply: string,
  opts?: { catalogTotal?: number; denyEmptyCatalog?: boolean },
): ResponseQualityReport {
  const text = reply.trim();
  const issues: string[] = [];
  let score = 100;

  if (text.length < MIN_LEN) {
    issues.push("too_short");
    score -= 35;
  }
  if (text.length > MAX_LEN) {
    issues.push("too_long");
    score -= 15;
  }
  if (!hasFollowUp(text)) {
    issues.push("missing_follow_up");
    score -= 20;
  }
  if (!hasSuggestion(text)) {
    issues.push("missing_suggestion");
    score -= 15;
  }
  if (opts?.denyEmptyCatalog && opts.catalogTotal && opts.catalogTotal > 0) {
    if (/no products|لا يوجد منتج|مفيش منتج|لا توجد منتجات/i.test(text)) {
      issues.push("false_empty_catalog");
      score -= 40;
    }
  }

  score = Math.max(0, Math.min(100, score));
  const pass = score >= 65 && !issues.includes("false_empty_catalog");

  const grade: ResponseQualityReport["grade"] =
    score >= 85 ? "excellent" : score >= 65 ? "good" : "weak";

  return { score, pass, issues, grade };
}
