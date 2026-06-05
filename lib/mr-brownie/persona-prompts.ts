import {
  getChatPersonaInstruction,
  type ChatPersona,
} from "@/lib/mr-brownie/personas";
import type { PromptVariant } from "@/lib/mr-brownie/prompt-variant";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

type PromptLocale = "ar" | "en" | "any";

export type PersonaPromptRow = {
  persona: ChatPersona;
  locale: PromptLocale;
  variant: PromptVariant;
  instruction: string;
  is_published: boolean;
  version: number;
  updated_at: string | null;
  updated_by: string | null;
};

/** مفتاح خريطة البرومبت: persona:locale:variant */
export type PersonaPromptKey = `${ChatPersona}:${PromptLocale}:${PromptVariant}`;
export type PersonaPromptOverrides = Partial<Record<PersonaPromptKey, string>>;

export function defaultPersonaPrompts(): PersonaPromptRow[] {
  return (["mr_brownie"] as const).flatMap((persona) =>
    (["ar", "en", "any"] as const).flatMap((locale) =>
      (["a", "b"] as const).map((variant) => ({
        persona,
        locale,
        variant,
        instruction: getChatPersonaInstruction(
          persona,
          locale === "any" ? "auto" : locale,
        ),
        is_published: false,
        version: 0,
        updated_at: null,
        updated_by: null,
      })),
    ),
  );
}

export async function loadPublishedPersonaPrompts(): Promise<PersonaPromptOverrides> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return {};

  const { data } = await supabase
    .from("mr_brownie_persona_prompts")
    .select("persona, locale, variant, instruction")
    .eq("is_published", true);

  const map: PersonaPromptOverrides = {};
  for (const row of data ?? []) {
    const variant = (row.variant === "b" ? "b" : "a") as PromptVariant;
    const key = `${row.persona}:${row.locale}:${variant}` as PersonaPromptKey;
    if (typeof row.instruction === "string" && row.instruction.trim()) {
      map[key] = row.instruction.trim();
    }
  }
  return map;
}

export function resolvePersonaInstruction(
  persona: ChatPersona,
  locale: "ar" | "en" | "auto",
  overrides: PersonaPromptOverrides,
  variant: PromptVariant = "a",
): string {
  const localeKey: PromptLocale = locale === "ar" || locale === "en" ? locale : "any";
  const specific = overrides[`${persona}:${localeKey}:${variant}`];
  const any = overrides[`${persona}:any:${variant}`];
  // fallback to variant 'a' if the chosen variant has no published prompt
  const specificA = overrides[`${persona}:${localeKey}:a`];
  const anyA = overrides[`${persona}:any:a`];
  if (specific?.trim()) return specific.trim();
  if (any?.trim()) return any.trim();
  if (specificA?.trim()) return specificA.trim();
  if (anyA?.trim()) return anyA.trim();
  return getChatPersonaInstruction(persona, locale);
}

export async function listPersonaPromptsForAdmin(): Promise<PersonaPromptRow[]> {
  const defaults = defaultPersonaPrompts();
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return defaults;

  const { data } = await supabase
    .from("mr_brownie_persona_prompts")
    .select(
      "persona, locale, variant, instruction, is_published, version, updated_at, updated_by",
    );

  const keyOf = (p: string, l: string, v: string) => `${p}:${l}:${v}`;
  const byKey = new Map<string, PersonaPromptRow>();
  for (const d of defaults) {
    byKey.set(keyOf(d.persona, d.locale, d.variant), d);
  }
  for (const row of data ?? []) {
    const variant = (row.variant === "b" ? "b" : "a") as PromptVariant;
    const key = keyOf(row.persona, row.locale, variant);
    const base = byKey.get(key);
    if (!row.instruction && base) continue;
    byKey.set(key, {
      persona: row.persona as ChatPersona,
      locale: row.locale as PromptLocale,
      variant,
      instruction: String(row.instruction),
      is_published: Boolean(row.is_published),
      version: Number(row.version) || 1,
      updated_at: row.updated_at ? String(row.updated_at) : null,
      updated_by: row.updated_by ? String(row.updated_by) : null,
    });
  }

  return [...byKey.values()].sort(
    (a, b) =>
      a.persona.localeCompare(b.persona) ||
      a.locale.localeCompare(b.locale) ||
      a.variant.localeCompare(b.variant),
  );
}

export async function savePersonaPrompt(input: {
  persona: ChatPersona;
  locale: PromptLocale;
  variant: PromptVariant;
  instruction: string;
  is_published: boolean;
  updated_by?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Database unavailable" };

  const trimmed = input.instruction.trim().slice(0, 8000);
  if (!trimmed) return { ok: false, error: "Instruction required" };

  const { data: existing } = await supabase
    .from("mr_brownie_persona_prompts")
    .select("version")
    .eq("persona", input.persona)
    .eq("locale", input.locale)
    .eq("variant", input.variant)
    .maybeSingle();

  const version = (Number(existing?.version) || 0) + 1;

  const { error } = await supabase.from("mr_brownie_persona_prompts").upsert(
    {
      persona: input.persona,
      locale: input.locale,
      variant: input.variant,
      instruction: trimmed,
      is_published: input.is_published,
      version,
      updated_at: new Date().toISOString(),
      updated_by: input.updated_by ?? null,
    },
    { onConflict: "persona,locale,variant" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
