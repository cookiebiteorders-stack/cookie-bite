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

async function relinkClerkToExistingUser(
  input: UpsertInput,
  existing: UserRow,
): Promise<UserRow | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("users")
    .update({
      clerk_user_id: input.clerkUserId,
      full_name: input.fullName ?? existing.full_name,
      avatar_url: input.avatarUrl ?? existing.avatar_url,
    })
    .eq("id", existing.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("relinkClerkToExistingUser error", error.message, error.code, error.details);
    return null;
  }
  return (data as UserRow) ?? null;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", normalized)
    .maybeSingle();
  if (error) {
    console.error("getUserByEmail error", error.message, error.code);
    return null;
  }
  return (data as UserRow) ?? null;
}

export async function upsertUserFromClerk(input: UpsertInput): Promise<UserRow | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;
  const email = input.email.trim().toLowerCase();
  const role = resolveStaffRoleFromEmail(email);

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        clerk_user_id: input.clerkUserId,
        email,
        full_name: input.fullName ?? null,
        avatar_url: input.avatarUrl ?? null,
        role,
      },
      { onConflict: "clerk_user_id" },
    )
    .select("*")
    .single();

  if (error) {
    console.error("upsertUserFromClerk error", error.message, error.code, error.details);
    if (error.code === "23505") {
      const byClerk = await getUserByClerkId(input.clerkUserId);
      if (byClerk) return byClerk;
      const byEmail = await getUserByEmail(email);
      if (byEmail) {
        return relinkClerkToExistingUser(input, byEmail);
      }
    }
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

  const { data: existing, error: readError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (readError) {
    console.error("markProfileCompleted read error", readError.message, readError.code);
    return null;
  }
  if (!existing) return null;
  if ((existing as UserRow).profile_completed_at) {
    return existing as UserRow;
  }

  const completedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("users")
    .update({ profile_completed_at: completedAt })
    .eq("id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("markProfileCompleted error", error.message, error.code, error.details);
    return null;
  }
  return (data as UserRow) ?? null;
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

  const runUpdate = async (p: Record<string, string | null>) => {
    return supabase.from("users").update(p).eq("id", userId).select("*").maybeSingle();
  };

  let { data, error } = await runUpdate(patch);

  const stripOptionalProfileCols = (p: Record<string, string | null>) => {
    const safe = { ...p };
    for (const col of [
      "full_name_en",
      "full_name_ar",
      "phone",
      "phone_secondary",
      "profile_notes",
    ] as const) {
      delete safe[col];
    }
    return safe;
  };

  if (
    error &&
    (error.code === "42703" || /column.*does not exist/i.test(error.message ?? ""))
  ) {
    const safe = stripOptionalProfileCols(patch);
    if (Object.keys(safe).length > 0) {
      const retry = await runUpdate(safe);
      data = retry.data;
      error = retry.error;
    }
  }

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
