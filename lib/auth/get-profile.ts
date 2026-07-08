import { auth } from "@/lib/auth/supabase-auth";
import { getUserBySupabaseId } from "@/lib/db/users";
import type { UserRow } from "@/lib/db/types";

/**
 * يعيد ملف المستخدم من Supabase لمن سجّل دخوله عبر Supabase Auth.
 * null إذا كان غير مسجّل أو لم يُهيَّأ Supabase بعد.
 *
 * ملاحظة: المخطط الحالي يستخدم جدول `users` (لا `profiles`).
 */
export async function getCurrentProfile(): Promise<UserRow | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    return await getUserBySupabaseId(userId);
  } catch (err) {
    console.error("getCurrentProfile error", err);
    return null;
  }
}

export async function requireCurrentProfile(): Promise<UserRow> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Response(
      JSON.stringify({
        error: { en: "Unauthorized", ar: "غير مصرح" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  return profile;
}
