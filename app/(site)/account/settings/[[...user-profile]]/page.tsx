import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AccountSettingsClient } from "@/components/account/account-settings-client";
import { requireCustomerProfileComplete } from "@/lib/account/require-complete-profile";
import { getAccessibleAdminConsoleNav } from "@/lib/admin/admin-console-nav";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { getRoleLabel, type UserRole } from "@/lib/admin/rbac";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Profile & Settings",
  description: "Manage your Cookie Bite profile, security, preferences, and notification choices.",
  path: "/account/settings",
  noIndex: true,
});

export default async function AccountSettingsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/account/settings");
  }

  let user: Awaited<ReturnType<typeof currentUser>> = null;
  try {
    user = await currentUser();
  } catch {
    /* Clerk unavailable — still render shell */
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    email ||
    "Cookie Bite friend";

  await requireCustomerProfileComplete(userId, {
    email,
    fullName,
    avatarUrl: user?.imageUrl ?? null,
  });

  let role: UserRole = "customer";
  try {
    role = await resolveStaffRole({ email, clerkUserId: userId });
  } catch {
    role = "customer";
  }

  const roleLabel = role === "customer" ? "Member" : getRoleLabel(role);
  const adminConsoleLinks = role !== "customer" ? getAccessibleAdminConsoleNav(role) : [];

  return (
    <AccountSettingsClient
      userName={fullName}
      userEmail={email}
      avatarUrl={user?.imageUrl ?? null}
      roleLabel={roleLabel}
      showAdminLinks={adminConsoleLinks.length > 0}
      adminConsoleLinks={adminConsoleLinks}
    />
  );
}
