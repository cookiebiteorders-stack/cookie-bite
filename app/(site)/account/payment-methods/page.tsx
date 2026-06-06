import { auth, currentUser } from "@clerk/nextjs/server";
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
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/account/payment-methods");
  }

  let user: Awaited<ReturnType<typeof currentUser>> = null;
  try {
    user = await currentUser();
  } catch {
    /* Clerk unavailable */
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    email ||
    "Cookie Bite friend";

  const dbUser = await requireCustomerProfileComplete(userId, {
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
  const methods = dbUser ? await listPaymentMethodsForUser(dbUser.id) : [];

  return (
    <AccountPaymentMethodsPageClient
      userName={fullName}
      userEmail={email}
      avatarUrl={user?.imageUrl ?? null}
      roleLabel={roleLabel}
      showAdminLinks={adminConsoleLinks.length > 0}
      adminConsoleLinks={adminConsoleLinks}
      initialMethods={methods}
    />
  );
}
