import { currentUser } from "@clerk/nextjs/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { resolveStaffRoleFromEmail } from "@/lib/admin/auth-role";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const role = resolveStaffRoleFromEmail(email);

  return <AdminShell role={role}>{children}</AdminShell>;
}
