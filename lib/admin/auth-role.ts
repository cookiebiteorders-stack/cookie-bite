import type { UserRole } from "@/lib/admin/rbac";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

const DEFAULT_OWNER_EMAIL = "cookie.bite.orders@gmail.com";

function parseCsv(input?: string) {
  if (!input) return [];
  return input
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

/** دور مبدئي من متغيرات البيئة (fallback). */
export function resolveStaffRoleFromEmail(email: string | null | undefined): UserRole {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) return "customer";

  const ownerEmail =
    (process.env.OWNER_BOOTSTRAP_EMAIL || DEFAULT_OWNER_EMAIL).trim().toLowerCase();
  const adminEmails = parseCsv(process.env.ADMIN_BOOTSTRAP_EMAILS);
  const staffEmails = parseCsv(process.env.STAFF_BOOTSTRAP_EMAILS);

  if (normalized === ownerEmail) return "owner";
  if (adminEmails.includes(normalized)) return "admin";
  if (staffEmails.includes(normalized)) return "staff";

  return "customer";
}

/**
 * يحدد الدور من قاعدة البيانات أولاً، ثم fallback لمتغيرات البيئة.
 * يُستخدم في السيرفر فقط لأنّه يعتمد على service-role.
 */
export async function resolveStaffRole(params: {
  email: string | null | undefined;
  supabaseUserId?: string | null;
  /** @deprecated — استخدم supabaseUserId */
  clerkUserId?: string | null;
}): Promise<UserRole> {
  const normalizedEmail = (params.email ?? "").trim().toLowerCase();
  const supabaseUserId = (params.supabaseUserId ?? params.clerkUserId ?? "").trim();

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    return resolveStaffRoleFromEmail(normalizedEmail || params.email);
  }

  try {
    let query = supabase.from("users").select("role").limit(1);

    if (supabaseUserId) {
      query = query.eq("id", supabaseUserId);
    } else if (normalizedEmail) {
      query = query.ilike("email", normalizedEmail);
    } else {
      return "customer";
    }

    const { data } = await query.maybeSingle();
    const role = (data?.role ?? "").toString() as UserRole;
    if (role === "owner" || role === "admin" || role === "staff" || role === "customer") {
      return role;
    }
  } catch {
    // fallback below
  }

  return resolveStaffRoleFromEmail(normalizedEmail);
}
