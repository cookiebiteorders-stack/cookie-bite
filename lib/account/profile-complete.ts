import type { UserRow } from "@/lib/db/types";

export function isProfileComplete(user: UserRow | null): boolean {
  if (!user) return false;
  return Boolean(user.profile_completed_at);
}
