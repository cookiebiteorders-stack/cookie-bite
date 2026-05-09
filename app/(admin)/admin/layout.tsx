import { auth, currentUser } from "@clerk/nextjs/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { PageShell } from "@/components/layout/page-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  let email: string | null = null;

  if (userId) {
    try {
      const user = await currentUser();
      email = user?.primaryEmailAddress?.emailAddress ?? null;
    } catch (e) {
      console.error("AdminLayout currentUser failed:", e);
    }
  }

  const role = await resolveStaffRole({ email, clerkUserId: userId ?? null });

  return (
    <PageShell>
      <AdminShell role={role}>{children}</AdminShell>
    </PageShell>
  );
}
