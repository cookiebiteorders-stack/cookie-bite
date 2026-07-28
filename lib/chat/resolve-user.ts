import type { SupabaseClient } from "@supabase/supabase-js";

/** يحوّل Supabase auth.uid إلى صف users.id في قاعدة البيانات */
export async function resolveDbUserId(
  supabase: SupabaseClient,
  supabaseUserId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", supabaseUserId)
    .maybeSingle();
  const id = data?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}
