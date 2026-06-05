import type { PersonalityMode } from "@/lib/mr-brownie/brain/personality-router";
import {
  resolvePersonaInstruction,
  type PersonaPromptOverrides,
} from "@/lib/mr-brownie/persona-prompts";
import type { PromptVariant } from "@/lib/mr-brownie/prompt-variant";

/** شخصية المتجر للعملاء — Mr. Brownie فقط. Mrs. Cookie حصرية لـ /admin/copilot */
export const STOREFRONT_PERSONA = "mr_brownie" as const;

const SUPPORT_OVERLAY = `
Support mode (still Mr. Brownie 🍫 — empathetic, no hard sell):
- Calm, patient tone; numbered steps when needed.
- For complaints: empathize first; link /help, /track, /account/orders.
- De-escalate; never pressure to buy during issues.
`.trim();

export function getStorefrontPersonaInstruction(
  personalityMode: PersonalityMode,
  crisisMode: boolean,
  locale: "ar" | "en" | "auto" = "auto",
  overrides: PersonaPromptOverrides = {},
  variant: PromptVariant = "a",
): string {
  // برومبت أساسي قابل للتجاوز عبر محرر الأدمن + A/B variant
  const base = resolvePersonaInstruction(
    STOREFRONT_PERSONA,
    locale,
    overrides,
    variant,
  );
  if (crisisMode || personalityMode === "support") {
    return `${base}\n\n${SUPPORT_OVERLAY}`;
  }
  return base;
}
