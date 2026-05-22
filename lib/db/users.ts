import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStaffRoleFromEmail } from "@/lib/admin/auth-role";
import type { UserRow } from "@/lib/db/types";

type UpsertInput = {
  clerkUserId: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
};

export type ProfileUpdateInput = {
  full_name_en?: string | null;
  full_name_ar?: string | null;
  phone?: string | null;
  phone_secondary?: string | null;
  profile_notes?: string | null;
  full_name?: string | null;
};

export async function upsertUserFromClerk(input: UpsertInput): Promise<UserRow | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;
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
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("clerk_user_id", clerkUserId);
  if (error) console.error("deleteUserByClerkId error", error);
}

export async function markProfileCompleted(userId: string): Promise<UserRow | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    console.error("markProfileCompleted: Supabase admin client unavailable");
    return null;
  }
  const { data, error } = await supabase
    .from("users")
    .update({ profile_completed_at: new Date().toISOString() })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) {
    console.error("markProfileCompleted error", error);
    return null;
  }
  return data as UserRow;
}

export async function updateUserProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<UserRow | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;

  const patch: Record<string, string | null> = {};
  if (input.full_name_en !== undefined) patch.full_name_en = input.full_name_en;
  if (input.full_name_ar !== undefined) patch.full_name_ar = input.full_name_ar;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.phone_secondary !== undefined) {
    patch.phone_secondary = input.phone_secondary;
  }
  if (input.profile_notes !== undefined) patch.profile_notes = input.profile_notes;
  if (input.full_name !== undefined) {
    patch.full_name = input.full_name;
  } else if (input.full_name_en !== undefined) {
    patch.full_name = input.full_name_en;
  }

  if (Object.keys(patch).length === 0) {
    const { data } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
    return (data as UserRow) ?? null;
  }

  const { data, error } = await supabase
    .from("users")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("updateUserProfile error", error.message, error.code, error.details);
    return null;
  }
  return (data as UserRow) ?? null;
}

export async function getUserByClerkId(clerkUserId: string): Promise<UserRow | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;
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
