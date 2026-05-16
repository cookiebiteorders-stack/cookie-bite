import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { DesignLibraryView } from "@/components/admin/design-library/design-library-view";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { canAccess } from "@/lib/admin/rbac";

export default async function AdminDesignLibraryPage() {
  let email: string | null = null;
  let clerkUserId = "";
  try {
    const user = await currentUser();
    email = user?.primaryEmailAddress?.emailAddress ?? null;
    clerkUserId = user?.id ?? "";
  } catch {
    email = null;
  }

  const role = await resolveStaffRole({ email, clerkUserId });
  if (!canAccess(role, "templates")) {
    redirect("/403");
  }

  return <DesignLibraryView />;
}
