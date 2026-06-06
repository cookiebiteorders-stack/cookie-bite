export type MrBrownieLlmProvider = "deepseek" | "gemini";

export type MrBrownieLlmConfig = {
  provider: MrBrownieLlmProvider;
  model: string;
  apiKey: string;
};

const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

export function resolveMrBrownieLlmProvider(
  prefer?: MrBrownieLlmProvider,
): MrBrownieLlmProvider | null {
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const envPref = process.env.MR_BROWNIE_LLM_PROVIDER?.trim().toLowerCase();

  if (prefer === "deepseek" && deepseekKey) return "deepseek";
  if (prefer === "gemini" && geminiKey) return "gemini";

  if (envPref === "deepseek" && deepseekKey) return "deepseek";
  if (envPref === "gemini" && geminiKey) return "gemini";

  if (deepseekKey) return "deepseek";
  if (geminiKey) return "gemini";
  return null;
}

export function getMrBrownieLlmConfig(
  prefer?: MrBrownieLlmProvider,
): MrBrownieLlmConfig {
  const provider = resolveMrBrownieLlmProvider(prefer);
  if (!provider) {
    throw new Error(
      "No LLM API key configured — set DEEPSEEK_API_KEY or GEMINI_API_KEY",
    );
  }

  if (provider === "deepseek") {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set");
    return {
      provider,
      model:
        process.env.MR_BROWNIE_DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL,
      apiKey,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return {
    provider,
    model:
      process.env.MR_BROWNIE_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    apiKey,
  };
}

export function getMrBrownieFallbackProvider(
  primary: MrBrownieLlmProvider,
): MrBrownieLlmProvider | null {
  if (primary === "deepseek" && process.env.GEMINI_API_KEY?.trim()) {
    return "gemini";
  }
  if (primary === "gemini" && process.env.DEEPSEEK_API_KEY?.trim()) {
    return "deepseek";
  }
  return null;
}
