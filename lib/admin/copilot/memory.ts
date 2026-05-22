import { playfulLuxuryColors } from "@/lib/design-tokens";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type OperatorMemory = {
  brand: {
    tone: string;
    language: "en" | "ar" | "bilingual";
    colors: Record<string, string>;
    layout_notes: string | null;
  };
  preferences: {
    preview_writes: boolean;
  };
  page_drafts: Record<
    string,
    {
      sections?: Array<{ id: string; type: string; content?: unknown; styles?: unknown }>;
      content?: Record<string, string>;
      styles?: Record<string, Record<string, string>>;
      order?: string[];
      updated_at: string;
    }
  >;
};

export const DEFAULT_OPERATOR_MEMORY: OperatorMemory = {
  brand: {
    tone: "playful luxury — warm, premium, New Cairo bakery",
    language: "bilingual",
    colors: {
      cream: playfulLuxuryColors.cream,
      caramel: playfulLuxuryColors.caramel,
      text_primary: playfulLuxuryColors.textPrimary,
      pastel_peach: playfulLuxuryColors.pastelPeach,
    },
    layout_notes: "Generous whitespace, serif headlines, caramel CTAs, RTL-friendly Arabic.",
  },
  preferences: { preview_writes: true },
  page_drafts: {},
};

function mergeMemory(base: OperatorMemory, patch: Partial<OperatorMemory>): OperatorMemory {
  return {
    brand: { ...base.brand, ...patch.brand },
    preferences: { ...base.preferences, ...patch.preferences },
    page_drafts: { ...base.page_drafts, ...patch.page_drafts },
  };
}

export async function loadOperatorMemory(clerkUserId: string): Promise<OperatorMemory> {
  const sb = tryCreateSupabaseAdminClient();
  if (!sb) return DEFAULT_OPERATOR_MEMORY;

  const { data, error } = await sb
    .from("copilot_operator_memory")
    .select("payload")
    .eq("scope", "operator")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error || !data?.payload || typeof data.payload !== "object") {
    return DEFAULT_OPERATOR_MEMORY;
  }

  const p = data.payload as Partial<OperatorMemory>;
  return mergeMemory(DEFAULT_OPERATOR_MEMORY, p);
}

export async function saveOperatorMemory(
  clerkUserId: string,
  patch: Partial<OperatorMemory>,
): Promise<OperatorMemory> {
  const current = await loadOperatorMemory(clerkUserId);
  const next = mergeMemory(current, patch);
  const sb = tryCreateSupabaseAdminClient();
  if (!sb) return next;

  const { error } = await sb.from("copilot_operator_memory").upsert(
    {
      scope: "operator",
      clerk_user_id: clerkUserId,
      payload: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "scope,clerk_user_id" },
  );

  if (error) console.error("saveOperatorMemory", error);
  return next;
}

export function pageDraftKey(page: string, section?: string): string {
  return section ? `${page}:${section}` : page;
}
