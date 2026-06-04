import { detectTrainingIntent } from "@/lib/mr-brownie/training/detect-intent";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export async function storeMrBrownieFeedback(input: {
  rating: 1 | -1;
  userMessage: string;
  assistantMessage: string;
  comment?: string;
  sessionId?: string;
  pathname?: string;
  locale?: string;
  clerkUserId?: string | null;
  guestSessionId?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, error: "Database unavailable" };
  }

  const intent = detectTrainingIntent(input.userMessage);

  const { data, error } = await supabase
    .from("mr_brownie_feedback")
    .insert({
      rating: input.rating,
      user_message: input.userMessage.trim().slice(0, 12000),
      assistant_message: input.assistantMessage.trim().slice(0, 12000),
      intent,
      comment: input.comment?.trim().slice(0, 500) ?? null,
      session_id: input.sessionId ?? null,
      pathname: input.pathname?.slice(0, 500) ?? null,
      locale: input.locale ?? null,
      clerk_user_id: input.clerkUserId ?? null,
      guest_session_id: input.guestSessionId ?? null,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("[training] store feedback", error);
    return { ok: false, error: error?.message ?? "Insert failed" };
  }

  return { ok: true, id: String(data.id) };
}
