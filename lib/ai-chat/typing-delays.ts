import type { ChatbotConfig } from "@/lib/ai-chat/config";

export function getTypingDelay(
  char: string,
  config: ChatbotConfig["typing"],
): number {
  if (!config.humanize) {
    return config.minDelay;
  }
  if (char === ".") return config.punctuationDelay + 20;
  if (char === "!" || char === "?") return config.punctuationDelay + 10;
  if (char === "," || char === ";" || char === ":") return config.punctuationDelay - 10;
  if (char === "\n") return config.newlineDelay;
  const spread = Math.max(0, config.maxDelay - config.minDelay);
  return config.minDelay + Math.random() * spread;
}
