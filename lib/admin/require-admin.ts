import { auth } from "@/lib/auth/supabase-auth";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { canAccess, type ModuleKey, type PermissionLevel, type UserRole, roleMatrix } from "@/lib/admin/rbac";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminActor = {
  supabase_user_id: string;
  user_id: string | null;
  email: string | null;
  role: UserRole;
  permission: PermissionLevel;
};

/** يرفض الوصول إذا لم يكن owner/admin/staff أو لم يملك صلاحية الوحدة. */
export async function requireAdminAccess(module: ModuleKey): Promise<AdminActor> {
  const { userId, user } = await auth();
  if (!userId || !user) {
    throw new Response(
      JSON.stringify({ error: { en: "Unauthorized", ar: "غير مصرح" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const email = user.email ?? null;
  const role = await resolveStaffRole({ email, supabaseUserId: userId });

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

  // اربط هوية Supabase بمستخدم Supabase (إن وُجد)
  let dbUserId: string | null = null;
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    dbUserId = (data?.id as string | undefined) ?? null;
  } catch {
    dbUserId = null;
  }

  return {
    supabase_user_id: userId,
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

/** Mrs. Cookie (copilot) — owner و admin فقط، ليس staff. */
export async function requireMrsCookieAccess(): Promise<AdminActor> {
  const actor = await requireAdminAccess("dashboard");
  if (actor.role !== "owner" && actor.role !== "admin") {
    throw new Response(
      JSON.stringify({
        error: {
          en: "Mrs. Cookie is available to owners and admins only",
          ar: "مسز كوكي متاحة للأونر والأدمن فقط",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  return actor;
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
