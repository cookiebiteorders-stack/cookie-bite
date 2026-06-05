import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type ToneVector = {
  formal_casual: number;
  serious_playful: number;
  concise_detailed: number;
  interaction_count: number;
};

export const TONE_VECTOR_LS_KEY = "mr-brownie-tone-v1";

const DEFAULT_TONE: ToneVector = {
  formal_casual: 0,
  serious_playful: 0,
  concise_detailed: 0,
  interaction_count: 0,
};

const MAX_SHIFT = 0.1;

function clamp(n: number): number {
  return Math.max(-1, Math.min(1, Math.round(n * 1000) / 1000));
}

export function toneVectorInstruction(v: ToneVector): string {
  const parts: string[] = [];
  if (v.formal_casual > 0.2) parts.push("User prefers casual tone.");
  else if (v.formal_casual < -0.2) parts.push("User prefers formal tone.");
  if (v.serious_playful > 0.2) parts.push("User responds well to playful humor — Mr. Brownie can be bolder.");
  else if (v.serious_playful < -0.2) parts.push("User prefers serious, calm tone — reduce jokes.");
  if (v.concise_detailed > 0.2) parts.push("User likes detailed explanations.");
  else if (v.concise_detailed < -0.2) parts.push("User prefers concise answers.");
  if (!parts.length) return "Tone vector: neutral defaults.";
  return `Tone personalization (max 10% shift per session): ${parts.join(" ")}`;
}

export async function loadToneVectorForUser(
  clerkUserId: string | null,
): Promise<ToneVector | null> {
  if (!clerkUserId) return null;
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("mr_brownie_user_tone")
    .select("formal_casual, serious_playful, concise_detailed, interaction_count")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (!data) return { ...DEFAULT_TONE };

  return {
    formal_casual: Number(data.formal_casual) || 0,
    serious_playful: Number(data.serious_playful) || 0,
    concise_detailed: Number(data.concise_detailed) || 0,
    interaction_count: Number(data.interaction_count) || 0,
  };
}

export function loadGuestToneVector(): ToneVector {
  if (typeof window === "undefined") return { ...DEFAULT_TONE };
  try {
    const raw = localStorage.getItem(TONE_VECTOR_LS_KEY);
    if (!raw) return { ...DEFAULT_TONE };
    const parsed = JSON.parse(raw) as Partial<ToneVector>;
    return {
      formal_casual: clamp(Number(parsed.formal_casual) || 0),
      serious_playful: clamp(Number(parsed.serious_playful) || 0),
      concise_detailed: clamp(Number(parsed.concise_detailed) || 0),
      interaction_count: Number(parsed.interaction_count) || 0,
    };
  } catch {
    return { ...DEFAULT_TONE };
  }
}

export function saveGuestToneVector(v: ToneVector): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TONE_VECTOR_LS_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export function shiftToneFromFeedback(
  current: ToneVector,
  params: {
    rating: 1 | -1;
    activePersona?: "mr_brownie" | "mrs_cookie";
  },
): ToneVector {
  const delta = params.rating === 1 ? MAX_SHIFT : -MAX_SHIFT * 0.5;
  const next = { ...current, interaction_count: current.interaction_count + 1 };

  if (params.activePersona === "mr_brownie") {
    next.serious_playful = clamp(next.serious_playful + delta);
    next.formal_casual = clamp(next.formal_casual + delta * 0.5);
  } else if (params.activePersona === "mrs_cookie") {
    next.concise_detailed = clamp(next.concise_detailed + delta);
    next.formal_casual = clamp(next.formal_casual - delta * 0.3);
  } else {
    next.serious_playful = clamp(next.serious_playful + delta * 0.5);
  }

  return next;
}

export async function persistToneVector(
  clerkUserId: string,
  vector: ToneVector,
): Promise<void> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return;

  await supabase.from("mr_brownie_user_tone").upsert(
    {
      clerk_user_id: clerkUserId,
      formal_casual: vector.formal_casual,
      serious_playful: vector.serious_playful,
      concise_detailed: vector.concise_detailed,
      interaction_count: vector.interaction_count,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clerk_user_id" },
  );
}
