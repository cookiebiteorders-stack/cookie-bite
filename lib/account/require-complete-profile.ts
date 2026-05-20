import { redirect } from "next/navigation";
import { isProfileComplete } from "@/lib/account/profile-complete";
import { getUserByClerkId, upsertUserFromClerk } from "@/lib/db/users";
import type { UserRow } from "@/lib/db/types";

/** يوجّه العملاء غير المكتملي الملف إلى صفحة الإكمال. */
export async function requireCustomerProfileComplete(
  clerkUserId: string,
  opts?: { email?: string | null; fullName?: string | null; avatarUrl?: string | null },
): Promise<UserRow> {
  let dbUser = await getUserByClerkId(clerkUserId);
  if (!dbUser && opts?.email) {
    dbUser = await upsertUserFromClerk({
      clerkUserId,
      email: opts.email,
      fullName: opts.fullName ?? null,
      avatarUrl: opts.avatarUrl ?? null,
    });
  }
  if (!dbUser) {
    redirect("/account/complete-profile");
  }
  if (dbUser.role === "customer" && !isProfileComplete(dbUser)) {
    redirect("/account/complete-profile");
  }
  return dbUser;
}
