import type { UserRow } from "@/lib/db/types";
import { getUserBySupabaseId, getUserByEmail, upsertUserFromSupabase } from "@/lib/db/users";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SERVICE_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  );
}

/** يضمن وجود صف في public.users لجلسة Supabase الحالية. */
export async function ensureDbUserForSupabase(supabaseUserId: string, email: string, fullName?: string | null, avatarUrl?: string | null): Promise<UserRow | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error("ensureDbUserForSupabase: missing Supabase admin env");
    return null;
  }

  const existing = await getUserBySupabaseId(supabaseUserId);
  if (existing) return existing;

  const created = await upsertUserFromSupabase({
    supabaseUserId,
    email,
    fullName: fullName ?? null,
    avatarUrl: avatarUrl ?? null,
  });
  if (created) return created;

  return getUserByEmail(email);
}
