import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStaffRoleFromEmail } from "@/lib/admin/auth-role";
import type { UserRow } from "@/lib/db/types";

type UpsertInput = {
  supabaseUserId: string;
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

async function relinkSupabaseToExistingUser(
  input: UpsertInput,
  existing: UserRow,
): Promise<UserRow | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      id: input.supabaseUserId,
      full_name: input.fullName ?? existing.full_name,
      avatar_url: input.avatarUrl ?? existing.avatar_url,
    })
    .eq("id", existing.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("relinkSupabaseToExistingUser error", error.message, error.code, error.details);
    return null;
  }
  return (data as UserRow) ?? null;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", normalized)
    .maybeSingle();
  if (error) {
    console.error("getUserByEmail error", error.message, error.code);
    return null;
  }
  return (data as UserRow) ?? null;
}

export async function upsertUserFromSupabase(input: UpsertInput): Promise<UserRow | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;
  const email = input.email.trim().toLowerCase();
  const role = resolveStaffRoleFromEmail(email);

  // First, check if user exists by email to preserve existing data
  const existingByEmail = await getUserByEmail(email);
  if (existingByEmail) {
    console.log(`[upsertUserFromSupabase] Found existing user by email: ${email}, preserving data`);
    // Update existing user with new Supabase ID if different
    if (existingByEmail.id !== input.supabaseUserId) {
      console.log(`[upsertUserFromSupabase] Relinking user from ${existingByEmail.id} to ${input.supabaseUserId}`);
      return relinkSupabaseToExistingUser(input, existingByEmail);
    }
    // User already has correct ID, just update metadata if provided
    if (input.fullName || input.avatarUrl) {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: input.fullName ?? existingByEmail.full_name,
          avatar_url: input.avatarUrl ?? existingByEmail.avatar_url,
        })
        .eq("id", existingByEmail.id)
        .select("*")
        .maybeSingle();
      if (error) {
        console.error("upsertUserFromSupabase update error", error.message, error.code, error.details);
        return existingByEmail;
      }
      return (data as UserRow) ?? existingByEmail;
    }
    return existingByEmail;
  }

  // No existing user by email, proceed with upsert
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: input.supabaseUserId,
        email,
        full_name: input.fullName ?? null,
        avatar_url: input.avatarUrl ?? null,
        role,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    console.error("upsertUserFromSupabase error", error.message, error.code, error.details);
    if (error.code === "23505") {
      const bySupabase = await getUserBySupabaseId(input.supabaseUserId);
      if (bySupabase) return bySupabase;
      const byEmail = await getUserByEmail(email);
      if (byEmail) {
        return relinkSupabaseToExistingUser(input, byEmail);
      }
    }
    return null;
  }
  return data as UserRow;
}

export async function deleteUserBySupabaseId(supabaseUserId: string) {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", supabaseUserId);
  if (error) console.error("deleteUserBySupabaseId error", error);
}

export async function markProfileCompleted(
  userId: string,
): Promise<
  | { ok: true; row: UserRow }
  | { ok: false; reason: "no_admin" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "read_error"; detail: string }
  | { ok: false; reason: "update_error"; detail: string }
> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    console.error("markProfileCompleted: Supabase admin client unavailable");
    return { ok: false, reason: "no_admin" };
  }

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (readError) {
    console.error("markProfileCompleted read error", readError.message, readError.code);
    return { ok: false, reason: "read_error", detail: readError.message };
  }
  if (!existing) return { ok: false, reason: "not_found" };
  if ((existing as UserRow).profile_completed_at) {
    return { ok: true, row: existing as UserRow };
  }

  const completedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("profiles")
    .update({ profile_completed_at: completedAt })
    .eq("id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("markProfileCompleted error", error.message, error.code, error.details);
    return { ok: false, reason: "update_error", detail: error.message };
  }
  return data ? { ok: true, row: data as UserRow } : { ok: false, reason: "not_found" };
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
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    return (data as UserRow) ?? null;
  }

  const runUpdate = async (p: Record<string, string | null>) => {
    return supabase.from("profiles").update(p).eq("id", userId).select("*").maybeSingle();
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

export async function getUserBySupabaseId(supabaseUserId: string): Promise<UserRow | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", supabaseUserId)
    .maybeSingle();
  if (error) {
    console.error("getUserBySupabaseId error", error);
    return null;
  }
  return (data as UserRow) ?? null;
}
