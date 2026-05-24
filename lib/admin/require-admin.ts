import { auth, clerkClient } from "@clerk/nextjs/server";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { canAccess, type ModuleKey, type PermissionLevel, type UserRole, roleMatrix } from "@/lib/admin/rbac";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminActor = {
  clerk_user_id: string;
  user_id: string | null;
  email: string | null;
  role: UserRole;
  permission: PermissionLevel;
};

/** يرفض الوصول إذا لم يكن owner/admin/staff أو لم يملك صلاحية الوحدة. */
export async function requireAdminAccess(module: ModuleKey): Promise<AdminActor> {
  const { userId } = await auth();
  if (!userId) {
    throw new Response(
      JSON.stringify({ error: { en: "Unauthorized", ar: "غير مصرح" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const role = await resolveStaffRole({ email, clerkUserId: userId });

  if (!["owner", "admin", "staff"].includes(role)) {
    throw new Response(
      JSON.stringify({ error: { en: "Forbidden", ar: "ممنوع" } }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const permission = roleMatrix[role][module];
  if (!canAccess(role, module)) {
    throw new Response(
      JSON.stringify({
        error: {
          en: "Access denied for this module",
          ar: "ليس لديك صلاحية لهذه الوحدة",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  // اربط هوية Clerk بمستخدم Supabase (إن وُجد)
  let dbUserId: string | null = null;
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", userId)
      .maybeSingle();
    dbUserId = (data?.id as string | undefined) ?? null;
  } catch {
    dbUserId = null;
  }

  return {
    clerk_user_id: userId,
    user_id: dbUserId,
    email,
    role,
    permission,
  };
}

/** يفرض أن مستوى الصلاحية كافٍ للكتابة (full أو limited). */
export function requireWritePermission(actor: AdminActor): void {
  if (actor.permission !== "full" && actor.permission !== "limited") {
    throw new Response(
      JSON.stringify({
        error: {
          en: "Read-only role: write not allowed",
          ar: "صلاحيتك للقراءة فقط",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
}

/** Owner فقط — لإعدادات حساسة (مفاتيح المتجر، feature flags). */
export async function requireOwnerAccess(module: ModuleKey = "settings"): Promise<AdminActor> {
  const actor = await requireAdminAccess(module);
  if (actor.role !== "owner") {
    throw new Response(
      JSON.stringify({
        error: {
          en: "Owner access required",
          ar: "يتطلب صلاحية المالك",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  return actor;
}

/** يفرض صلاحية كاملة فقط (owner، أو admin مع full). */
export function requireFullPermission(actor: AdminActor): void {
  if (actor.permission !== "full") {
    throw new Response(
      JSON.stringify({
        error: {
          en: "Insufficient permission",
          ar: "صلاحياتك غير كافية لهذا الإجراء",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
}
