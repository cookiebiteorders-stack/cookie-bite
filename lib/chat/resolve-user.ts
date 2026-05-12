import type { SupabaseClient } from "@supabase/supabase-js";

/** يحوّل Clerk sub إلى صف users.id في قاعدة البيانات */
export async function resolveDbUserId(
  supabase: SupabaseClient,
  clerkUserId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  const id = data?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}
