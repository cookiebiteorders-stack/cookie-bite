import { currentUser } from "@clerk/nextjs/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { PageShell } from "@/components/layout/page-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const role = await resolveStaffRole({ email, clerkUserId: user?.id ?? null });

  return (
    <PageShell>
      <AdminShell role={role}>{children}</AdminShell>
    </PageShell>
  );
}
