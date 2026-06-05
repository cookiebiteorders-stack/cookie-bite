import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type CopilotPromptConfig = {
  overlay: string;
  is_published: boolean;
  updated_at: string | null;
  updated_by: string | null;
};

const EMPTY: CopilotPromptConfig = {
  overlay: "",
  is_published: false,
  updated_at: null,
  updated_by: null,
};

/** يُحمَّل ويُضاف إلى نظام برومبت Mrs. Cookie عند النشر فقط. */
export async function loadCopilotPromptOverlay(): Promise<string> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return "";

  const { data } = await supabase
    .from("mr_brownie_copilot_prompt")
    .select("overlay, is_published")
    .eq("id", true)
    .maybeSingle();

  if (data?.is_published && typeof data.overlay === "string" && data.overlay.trim()) {
    return data.overlay.trim();
  }
  return "";
}

export async function getCopilotPromptConfig(): Promise<CopilotPromptConfig> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return { ...EMPTY };

  const { data } = await supabase
    .from("mr_brownie_copilot_prompt")
    .select("overlay, is_published, updated_at, updated_by")
    .eq("id", true)
    .maybeSingle();

  if (!data) return { ...EMPTY };
  return {
    overlay: String(data.overlay ?? ""),
    is_published: Boolean(data.is_published),
    updated_at: data.updated_at ? String(data.updated_at) : null,
    updated_by: data.updated_by ? String(data.updated_by) : null,
  };
}

export async function saveCopilotPromptConfig(input: {
  overlay: string;
  is_published: boolean;
  updated_by?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Database unavailable" };

  const { error } = await supabase.from("mr_brownie_copilot_prompt").upsert(
    {
      id: true,
      overlay: input.overlay.trim().slice(0, 8000),
      is_published: input.is_published,
      updated_at: new Date().toISOString(),
      updated_by: input.updated_by ?? null,
    },
    { onConflict: "id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
