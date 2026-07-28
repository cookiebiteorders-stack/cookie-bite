import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * orders.user_id → auth.users؛ loyalty_accounts.user_id → public.users
 * يربط عبر البريد عند اختلاف المعرّفات.
 */
export async function resolveLoyaltyAccountUserId(
  supabase: SupabaseClient,
  authUserId: string,
  guestEmail?: string | null,
): Promise<string | null> {
  const { data: direct } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", authUserId)
    .maybeSingle();
  if (direct?.id) return direct.id as string;

  let email = guestEmail?.trim() || null;
  if (!email) {
    const { data: authData } = await supabase.auth.admin.getUserById(authUserId);
    email = authData?.user?.email ?? null;
  }
  if (!email) return null;

  const { data: byEmail } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  return (byEmail?.id as string | undefined) ?? null;
}
