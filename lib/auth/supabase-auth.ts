import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type AuthResult = {
  userId: string | null;
  user: User | null;
};

/** يعيد المستخدم الحالي من Supabase Auth — بديل Clerk auth(). */
export async function auth(): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { userId: null, user: null };
    }

    return { userId: user.id, user };
  } catch (err) {
    console.error("auth error", err);
    return { userId: null, user: null };
  }
}

/** بديل Clerk currentUser(). */
export async function currentUser(): Promise<User | null> {
  const { user } = await auth();
  return user;
}

export async function getUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth();
  return Boolean(userId);
}
