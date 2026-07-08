import { auth } from "@/lib/auth/supabase-auth";
import { redirect } from "next/navigation";
import { AccountAddressesPageClient } from "@/components/account/account-addresses-page-client";
import { requireCustomerProfileComplete } from "@/lib/account/require-complete-profile";
import { getAccessibleAdminConsoleNav } from "@/lib/admin/admin-console-nav";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { getRoleLabel, type UserRole } from "@/lib/admin/rbac";
import { listAddressesForUser } from "@/lib/db/addresses";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "My Addresses",
  description: "Manage your Cookie Bite delivery addresses with GPS and map search.",
  path: "/account/addresses",
  noIndex: true,
});

export default async function AccountAddressesPage() {
  const { userId, user } = await auth();
  if (!userId || !user) {
    redirect("/sign-in?redirect_url=/account/addresses");
  }

  const email = user.email ?? null;
  const fullName = user.user_metadata?.full_name ?? email ?? "Cookie Bite friend";

  const dbUser = await requireCustomerProfileComplete(userId, {
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
  const addresses = dbUser ? await listAddressesForUser(dbUser.id) : [];

  return (
    <AccountAddressesPageClient
      userName={fullName}
      userEmail={email}
      avatarUrl={user.user_metadata?.avatar_url ?? null}
      roleLabel={roleLabel}
      showAdminLinks={adminConsoleLinks.length > 0}
      adminConsoleLinks={adminConsoleLinks}
      initialAddresses={addresses}
    />
  );
}
