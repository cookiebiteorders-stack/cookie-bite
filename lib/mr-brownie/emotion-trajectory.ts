import { scoreSentiment } from "@/lib/mr-brownie/sentiment";

export type EmotionTrajectory = {
  scores: number[];
  latest: number;
  average: number;
  trend: "improving" | "stable" | "declining";
  crisis_mode: boolean;
  negative_streak: number;
};

export function buildEmotionTrajectory(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  window = 5,
): EmotionTrajectory {
  const userTexts = messages.filter((m) => m.role === "user").map((m) => m.content);
  const recent = userTexts.slice(-window);
  const scores = recent.map((t) => scoreSentiment(t));

  if (!scores.length) {
    return {
      scores: [],
      latest: 0,
      average: 0,
      trend: "stable",
      crisis_mode: false,
      negative_streak: 0,
    };
  }

  const latest = scores[scores.length - 1] ?? 0;
  const average = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;

  let negative_streak = 0;
  for (let i = scores.length - 1; i >= 0; i--) {
    if ((scores[i] ?? 0) < -0.2) negative_streak += 1;
    else break;
  }

  const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
  const secondHalf = scores.slice(Math.ceil(scores.length / 2));
  const avgFirst =
    firstHalf.length > 0
      ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      : average;
  const avgSecond =
    secondHalf.length > 0
      ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      : average;

  let trend: EmotionTrajectory["trend"] = "stable";
  if (avgSecond - avgFirst > 0.15) trend = "improving";
  else if (avgFirst - avgSecond > 0.15) trend = "declining";

  return {
    scores,
    latest,
    average,
    trend,
    crisis_mode: negative_streak >= 3 || latest < -0.5,
    negative_streak,
  };
}

export function emotionTrajectoryInstruction(traj: EmotionTrajectory): string {
  if (traj.crisis_mode) {
    return "Emotion trajectory: CRISIS — user sentiment declining. Switch to Mrs. Cookie de-escalation: empathize, no upsell, numbered steps.";
  }
  if (traj.trend === "declining") {
    return "Emotion trajectory: declining — slow pace, reassure, avoid hard CTAs.";
  }
  if (traj.latest > 0.5) {
    return "Emotion trajectory: positive — match energy; light celebration OK for Mr. Brownie.";
  }
  return "Emotion trajectory: neutral — professional warmth.";
}
