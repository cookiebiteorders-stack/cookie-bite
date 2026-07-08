import { auth } from "@/lib/auth/supabase-auth";
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
  const { userId, user } = await auth();
  if (!userId || !user) {
    redirect("/sign-in?redirect_url=/account/settings");
  }

  const email = user.email ?? null;
  const fullName = user.user_metadata?.full_name ?? email ?? "Cookie Bite friend";

  await requireCustomerProfileComplete(userId, {
    email,
    fullName,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
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
      avatarUrl={user.user_metadata?.avatar_url ?? null}
      roleLabel={roleLabel}
      showAdminLinks={adminConsoleLinks.length > 0}
      adminConsoleLinks={adminConsoleLinks}
    />
  );
}
