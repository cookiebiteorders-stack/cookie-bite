import { auth } from "@/lib/auth/supabase-auth";
import { redirect } from "next/navigation";
import { AccountOrdersPageClient } from "@/components/account/account-orders-page-client";
import { mapOrderRowToAccountOrder } from "@/lib/account/map-order-row";
import { requireCustomerProfileComplete } from "@/lib/account/require-complete-profile";
import { getAccessibleAdminConsoleNav } from "@/lib/admin/admin-console-nav";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { getRoleLabel, type UserRole } from "@/lib/admin/rbac";
import { countOrdersForUser, listOrdersForUser } from "@/lib/db/orders";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "My Orders",
  description: "View your Cookie Bite order history, tracking, and invoices.",
  path: "/account/orders",
  noIndex: true,
});

export default async function AccountOrdersPage() {
  const { userId, user } = await auth();
  if (!userId || !user) {
    redirect("/sign-in?redirect_url=/account/orders");
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

  const [orders, totalCount] = await Promise.all([
    dbUser ? listOrdersForUser(dbUser.id) : [],
    dbUser ? countOrdersForUser(dbUser.id) : 0,
  ]);

  return (
    <AccountOrdersPageClient
      userName={fullName}
      userEmail={email}
      avatarUrl={user.user_metadata?.avatar_url ?? null}
      roleLabel={roleLabel}
      showAdminLinks={adminConsoleLinks.length > 0}
      adminConsoleLinks={adminConsoleLinks}
      orders={orders.map(mapOrderRowToAccountOrder)}
      totalCount={totalCount}
    />
  );
}
