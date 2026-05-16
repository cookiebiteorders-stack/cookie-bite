import { auth, currentUser } from "@clerk/nextjs/server";
import { getAccessibleAdminConsoleNav } from "@/lib/admin/admin-console-nav";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import type { AdminNavMenuItem } from "@/lib/admin/admin-nav-menu";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ items: [] as AdminNavMenuItem[] });
  }

  let email: string | null = null;
  try {
    const user = await currentUser();
    email = user?.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    email = null;
  }

  const role = await resolveStaffRole({ email, clerkUserId: userId });
  if (!["owner", "admin", "staff"].includes(role)) {
    return Response.json({ items: [] as AdminNavMenuItem[] });
  }

  const items: AdminNavMenuItem[] = getAccessibleAdminConsoleNav(role).map(({ href, module }) => ({
    href,
    module,
  }));

  return Response.json({ items });
}
