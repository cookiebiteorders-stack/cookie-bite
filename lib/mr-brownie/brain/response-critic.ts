import type { ResponseQualityReport } from "@/lib/mr-brownie/brain/response-quality";

export type WeightedQualityDimensions = {
  clarity: number;
  helpfulness: number;
  engagement: number;
  conversion: number;
};

export type CriticVerdict = ResponseQualityReport & {
  dimensions: WeightedQualityDimensions;
  critic_pass: boolean;
  critic_notes: string[];
};

const WEIGHTS = {
  clarity: 0.25,
  helpfulness: 0.25,
  engagement: 0.25,
  conversion: 0.25,
} as const;

function scoreClarity(text: string): number {
  let s = 100;
  if (text.length < 40) s -= 50;
  if (text.length > 2200) s -= 20;
  if (!/[.!?\n]/.test(text)) s -= 15;
  return Math.max(0, s);
}

function scoreHelpfulness(text: string, catalogTotal?: number): number {
  let s = 70;
  if (/\b(help|مساعدة|policy|سياسة|faq)\b/i.test(text)) s += 10;
  if (catalogTotal && catalogTotal > 0 && /no products|لا يوجد منتج/i.test(text)) s = 10;
  if (/\d+\s*(egp|جنيه)/i.test(text) || /\/shop|\/gift/i.test(text)) s += 20;
  return Math.min(100, s);
}

function scoreEngagement(text: string): number {
  let s = 60;
  if (/[؟?]/.test(text)) s += 25;
  if (/[*•-]\s+\S/.test(text)) s += 15;
  if (/\b(تمام|great|👌|🐻)/i.test(text)) s += 10;
  return Math.min(100, s);
}

function scoreConversion(text: string): number {
  let s = 50;
  if (/\b(checkout|cart|سلة|أضيف|add|\/gift-box|buy|اشتري)\b/i.test(text)) s += 30;
  if (/\b(اقترح|suggest|recommend|أنصح)\b/i.test(text)) s += 20;
  return Math.min(100, s);
}

/** Critic — تقييم v1 قبل عرض الرد للمستخدم */
export function runResponseCritic(
  reply: string,
  opts?: { catalogTotal?: number },
): CriticVerdict {
  const dimensions: WeightedQualityDimensions = {
    clarity: scoreClarity(reply),
    helpfulness: scoreHelpfulness(reply, opts?.catalogTotal),
    engagement: scoreEngagement(reply),
    conversion: scoreConversion(reply),
  };

  const score = Math.round(
    dimensions.clarity * WEIGHTS.clarity +
      dimensions.helpfulness * WEIGHTS.helpfulness +
      dimensions.engagement * WEIGHTS.engagement +
      dimensions.conversion * WEIGHTS.conversion,
  );

  const issues: string[] = [];
  const critic_notes: string[] = [];
  if (dimensions.clarity < 65) {
    issues.push("low_clarity");
    critic_notes.push("Clarity below threshold");
  }
  if (dimensions.engagement < 60) {
    issues.push("missing_follow_up");
    critic_notes.push("Add follow-up question");
  }
  if (dimensions.conversion < 55) {
    issues.push("missing_suggestion");
    critic_notes.push("Add product/path suggestion");
  }
  if (dimensions.helpfulness < 55) {
    issues.push("low_helpfulness");
    critic_notes.push("Increase actionable help");
  }

  const pass = score >= 65 && !issues.includes("low_helpfulness");
  const grade: CriticVerdict["grade"] =
    score >= 85 ? "excellent" : score >= 65 ? "good" : "weak";

  return {
    score,
    pass,
    issues,
    grade,
    dimensions,
    critic_pass: pass,
    critic_notes,
  };
}
