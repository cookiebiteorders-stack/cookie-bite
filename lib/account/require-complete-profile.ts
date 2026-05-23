import { redirect } from "next/navigation";
import { isProfileComplete } from "@/lib/account/profile-complete";
import { ensureDbUserForClerk } from "@/lib/db/ensure-db-user";
import type { UserRow } from "@/lib/db/types";

/** يوجّه العملاء غير المكتملي الملف إلى صفحة الإكمال. */
export async function requireCustomerProfileComplete(
  clerkUserId: string,
  _opts?: { email?: string | null; fullName?: string | null; avatarUrl?: string | null },
): Promise<UserRow> {
  const dbUser = await ensureDbUserForClerk(clerkUserId);
  if (!dbUser) {
    redirect("/account/complete-profile");
  }
  if (dbUser.role === "customer" && !isProfileComplete(dbUser)) {
    redirect("/account/complete-profile");
  }
  return dbUser;
}
