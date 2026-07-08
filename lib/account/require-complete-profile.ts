import { redirect } from "next/navigation";
import { isProfileComplete } from "@/lib/account/profile-complete";
import { ensureDbUserForSupabase } from "@/lib/db/ensure-db-user";
import type { UserRow } from "@/lib/db/types";

/** يوجّه العملاء غير المكتملي الملف إلى صفحة الإكمال. */
export async function requireCustomerProfileComplete(
  supabaseUserId: string,
  opts?: { email?: string | null; fullName?: string | null; avatarUrl?: string | null },
): Promise<UserRow> {
  const dbUser = await ensureDbUserForSupabase(supabaseUserId, opts?.email ?? "", opts?.fullName, opts?.avatarUrl);
  if (!dbUser) {
    redirect("/account/complete-profile");
  }
  if (dbUser.role === "customer" && !isProfileComplete(dbUser)) {
    redirect("/account/complete-profile");
  }
  return dbUser;
}
