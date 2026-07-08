import { auth } from "@/lib/auth/supabase-auth";
import { redirect } from "next/navigation";
import { AccountPaymentMethodsPageClient } from "@/components/account/account-payment-methods-page-client";
import { requireCustomerProfileComplete } from "@/lib/account/require-complete-profile";
import { getAccessibleAdminConsoleNav } from "@/lib/admin/admin-console-nav";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { getRoleLabel, type UserRole } from "@/lib/admin/rbac";
import { listPaymentMethodsForUser } from "@/lib/db/payment-methods";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Payment Methods",
  description: "Manage your saved Cookie Bite payment preferences.",
  path: "/account/payment-methods",
  noIndex: true,
});

export default async function AccountPaymentMethodsPage() {
  const { userId, user } = await auth();
  if (!userId || !user) {
    redirect("/sign-in?redirect_url=/account/payment-methods");
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
  const methods = dbUser ? await listPaymentMethodsForUser(dbUser.id) : [];

  return (
    <AccountPaymentMethodsPageClient
      userName={fullName}
      userEmail={email}
      avatarUrl={user.user_metadata?.avatar_url ?? null}
      roleLabel={roleLabel}
      showAdminLinks={adminConsoleLinks.length > 0}
      adminConsoleLinks={adminConsoleLinks}
      initialMethods={methods}
    />
  );
}
