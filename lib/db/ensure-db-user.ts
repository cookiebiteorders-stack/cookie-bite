import { clerkClient, currentUser } from "@clerk/nextjs/server";
import type { UserRow } from "@/lib/db/types";
import { getUserByClerkId, getUserByEmail, upsertUserFromClerk } from "@/lib/db/users";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SERVICE_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  );
}

async function clerkEmailAndName(clerkUserId: string): Promise<{
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
} | null> {
  const sessionUser = await currentUser();
  if (sessionUser?.id === clerkUserId) {
    const email = sessionUser.primaryEmailAddress?.emailAddress;
    if (email) {
      return {
        email,
        fullName:
          [sessionUser.firstName, sessionUser.lastName].filter(Boolean).join(" ").trim() ||
          null,
        avatarUrl: sessionUser.imageUrl ?? null,
      };
    }
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    const email =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
      user.emailAddresses[0]?.emailAddress;
    if (!email) return null;
    return {
      email,
      fullName: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || null,
      avatarUrl: user.imageUrl ?? null,
    };
  } catch (err) {
    console.error("clerkEmailAndName failed", err);
    return null;
  }
}

/** يضمن وجود صف في public.users لجلسة Clerk الحالية. */
export async function ensureDbUserForClerk(clerkUserId: string): Promise<UserRow | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error("ensureDbUserForClerk: missing Supabase admin env");
    return null;
  }

  const existing = await getUserByClerkId(clerkUserId);
  if (existing) return existing;

  const identity = await clerkEmailAndName(clerkUserId);
  if (!identity) {
    console.error("ensureDbUserForClerk: no email for Clerk user", clerkUserId);
    return null;
  }

  const created = await upsertUserFromClerk({
    clerkUserId,
    email: identity.email,
    fullName: identity.fullName,
    avatarUrl: identity.avatarUrl,
  });
  if (created) return created;

  return getUserByEmail(identity.email);
}
