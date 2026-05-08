import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStaffRoleFromEmail } from "@/lib/admin/auth-role";
import type { UserRow } from "@/lib/db/types";

type UpsertInput = {
  clerkUserId: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
};

export async function upsertUserFromClerk(input: UpsertInput): Promise<UserRow | null> {
  const supabase = createSupabaseAdminClient();
  const role = resolveStaffRoleFromEmail(input.email);

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        clerk_user_id: input.clerkUserId,
        email: input.email.toLowerCase(),
        full_name: input.fullName ?? null,
        avatar_url: input.avatarUrl ?? null,
        role,
      },
      { onConflict: "clerk_user_id" },
    )
    .select("*")
    .single();

  if (error) {
    console.error("upsertUserFromClerk error", error);
    return null;
  }
  return data as UserRow;
}

export async function deleteUserByClerkId(clerkUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("clerk_user_id", clerkUserId);
  if (error) console.error("deleteUserByClerkId error", error);
}

export async function getUserByClerkId(clerkUserId: string): Promise<UserRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  if (error) {
    console.error("getUserByClerkId error", error);
    return null;
  }
  return (data as UserRow) ?? null;
}
