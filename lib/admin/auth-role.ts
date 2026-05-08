import type { UserRole } from "@/lib/admin/rbac";

const DEFAULT_OWNER_EMAIL = "cookie.bite.orders@gmail.com";

function parseCsv(input?: string) {
  if (!input) return [];
  return input
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * يحدد دور الموظف من البريد فقط (مصدر موثوق مثل Clerk على السيرفر).
 * لا تمرّر بريداً من العميل دون تحقق.
 */
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
