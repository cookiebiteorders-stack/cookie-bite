import { auth } from "@/lib/auth/supabase-auth";
import { getAccessibleAdminConsoleNav } from "@/lib/admin/admin-console-nav";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import type { AdminNavMenuItem } from "@/lib/admin/admin-nav-menu";

export async function GET() {
  const { userId, user } = await auth();
  if (!userId || !user) {
    return Response.json({ items: [] as AdminNavMenuItem[] });
  }

  const email = user.email ?? null;
  const role = await resolveStaffRole({ email, clerkUserId: userId });
  if (!["owner", "admin", "staff"].includes(role)) {
    return Response.json({ items: [] as AdminNavMenuItem[] });
  }

  const items: AdminNavMenuItem[] = getAccessibleAdminConsoleNav(role).map(
    ({ href, module, navKey }) => ({
      href,
      module,
      navKey,
    }),
  );

  return Response.json({ items });
}
