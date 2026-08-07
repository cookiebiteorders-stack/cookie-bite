import type { UserRole } from "@/lib/admin/rbac";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

const DEFAULT_OWNER_EMAIL = "cookie.bite.orders@gmail.com";

const DEFAULT_OWNER_BOOTSTRAP_EMAILS = [
  "bitecookie532@gmail.com",
  "cookie.bite.orders@gmail.com",
  "fatmaelbeshawy75@gmail.com",
  "mohamedabbasyounis@gmail.com",
  "mohamedalwardani1@gmail.com",
];

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

  // Check against multiple owner bootstrap emails
  const ownerBootstrapEmails = parseCsv(process.env.OWNER_BOOTSTRAP_EMAILS);
  const ownerEmails = ownerBootstrapEmails.length > 0 
    ? ownerBootstrapEmails 
    : DEFAULT_OWNER_BOOTSTRAP_EMAILS.map(e => e.toLowerCase());
  
  if (ownerEmails.includes(normalized)) return "owner";
  
  const adminEmails = parseCsv(process.env.ADMIN_BOOTSTRAP_EMAILS);
  const staffEmails = parseCsv(process.env.STAFF_BOOTSTRAP_EMAILS);

  if (adminEmails.includes(normalized)) return "admin";
  if (staffEmails.includes(normalized)) return "staff";

  return "customer";
}

/**
 * يحدد الدور من قاعدة البيانات أولاً (users table is canonical).
 * في الإنتاج: يفشل إذا لم يكن السجل موجوداً (fail-closed).
 * في التطوير: يسمح بـ fallback لمتغيرات البيئة للإعداد الأولي فقط.
 */
export async function resolveStaffRole(params: {
  email: string | null | undefined;
  supabaseUserId?: string | null;
}): Promise<UserRole> {
  const normalizedEmail = (params.email ?? "").trim().toLowerCase();
  const supabaseUserId = (params.supabaseUserId ?? "").trim();

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    console.warn("[auth-role] Database client unavailable");
    // In production: fail closed by returning customer (no privilege escalation)
    // In development: allow fallback for easier setup
    if (process.env.NODE_ENV === "production") {
      return "customer";
    }
    console.warn("[auth-role] Development mode: using email fallback");
    return resolveStaffRoleFromEmail(normalizedEmail || params.email);
  }

  try {
    // Query canonical users table only (not profiles)
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
  } catch (err) {
    console.error("[auth-role] Database lookup failed:", err instanceof Error ? err.message : String(err));
    // In production: fail closed by returning customer (no privilege escalation)
    // In development: allow fallback for easier setup
    if (process.env.NODE_ENV === "production") {
      return "customer";
    }
    console.warn("[auth-role] Development mode: using email fallback after DB error");
    return resolveStaffRoleFromEmail(normalizedEmail || params.email);
  }

  return "customer";
}
