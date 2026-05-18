import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import {
  Bell,
  CreditCard,
  FileText,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Package,
  Star,
  User,
} from "lucide-react";

import { AccountTestimonialForm } from "@/components/account/account-testimonial-form";
import { RedeemPointsCard } from "@/components/account/redeem-points-card";
import { buttonClassName } from "@/components/ui/button";
import { getAccessibleAdminConsoleNav } from "@/lib/admin/admin-console-nav";
import { getAdminNavIcon } from "@/lib/admin/admin-console-nav-icons";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { getRoleLabel, type UserRole } from "@/lib/admin/rbac";
import {
  ACCOUNT_ROLE_DASHBOARD_COPY,
  accountRoleBadgeClass,
} from "@/lib/account/account-role-dashboard";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { listRecentOrdersForUser } from "@/lib/db/orders";
import { getUserByClerkId, upsertUserFromClerk } from "@/lib/db/users";
import { cn } from "@/lib/utils";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "My Account Dashboard",
  description:
    "Manage your Cookie Bite account, orders, wishlist, addresses, and loyalty rewards from one personalized dashboard.",
  path: "/account",
  keywords: ["cookie bite account", "order history", "loyalty points dashboard"],
  noIndex: true,
});

const customerNavItems = [
  { label: "Dashboard", href: "/account", icon: LayoutDashboard },
  { label: "My Orders", href: "/account#orders", icon: Package },
  { label: "My Addresses", href: "/account#addresses", icon: MapPin },
  { label: "Payment Methods", href: "/account#pay", icon: CreditCard },
  { label: "Wishlist", href: "/account#wish", icon: Heart },
  { label: "Rewards & Points", href: "/account#rewards", icon: Star },
  { label: "Profile & settings", href: "/account/settings", icon: User },
  { label: "My comments", href: "/account#feedback", icon: MessageSquare },
  { label: "Notifications", href: "/account#notifications", icon: Bell },
  { label: "Help & Support", href: "/contact", icon: HelpCircle },
] as const;

function resolveAccountRole(
  dbUser: { role: UserRole } | null,
  email: string | null,
  clerkUserId: string,
): Promise<UserRole> {
  if (
    dbUser &&
    (dbUser.role === "owner" ||
      dbUser.role === "admin" ||
      dbUser.role === "staff" ||
      dbUser.role === "customer")
  ) {
    return Promise.resolve(dbUser.role);
  }
  return resolveStaffRole({ email, clerkUserId });
}

const STATUS_BADGE: Record<string, string> = {
  delivered: "bg-emerald-100 text-emerald-800",
  shipped: "bg-amber-100 text-amber-800",
  processing: "bg-cb-peach text-cb-text-strong",
  pending: "bg-cb-peach text-cb-text-strong",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-slate-200 text-slate-800",
};

type ProductImageItem = { url?: string | null };
type WishlistProduct = {
  id?: string;
  slug?: string | null;
  name?: string | null;
  title_en?: string | null;
  title_ar?: string | null;
  price_egp?: number | null;
  image_url?: string | null;
  images?: ProductImageItem[] | null;
  is_active?: boolean;
};
type WishlistItem = { id: string; product?: WishlistProduct | null };
type AddressItem = {
  id: string;
  label?: string | null;
  recipient?: string | null;
  phone?: string | null;
  city?: string | null;
  governorate?: string | null;
  street?: string | null;
  is_default?: boolean | null;
};
type NotificationItem = {
  id: string;
  title?: string | null;
  body?: string | null;
  href?: string | null;
  created_at?: string | null;
};
type TestimonialItem = {
  id: string;
  rating?: number | null;
  comment?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export default async function AccountPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/account");
  }

  let user: Awaited<ReturnType<typeof currentUser>> = null;
  try {
    user = await currentUser();
  } catch (e) {
    console.error("AccountPage currentUser failed:", e);
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    email ||
    "Cookie Bite friend";

  let dbUser = await getUserByClerkId(userId);
  if (!dbUser && email) {
    dbUser = await upsertUserFromClerk({
      clerkUserId: userId,
      email,
      fullName,
      avatarUrl: user?.imageUrl ?? null,
    });
  }

  const accountRole = await resolveAccountRole(dbUser, email, userId);
  const adminSidebarLinks =
    accountRole !== "customer" ? getAccessibleAdminConsoleNav(accountRole) : [];
  const roleCopy = ACCOUNT_ROLE_DASHBOARD_COPY[accountRole];

  const orders = dbUser ? await listRecentOrdersForUser(dbUser.id, 3) : [];

  const supabase = dbUser ? tryCreateSupabaseAdminClient() : null;
  const [loyaltyAccount, wishlistItems, addressesItems, notificationsItems, testimonialItems] =
    await Promise.all([
      !supabase
        ? Promise.resolve(null)
        : (async () => {
          const { data } = await supabase
            .from("loyalty_accounts")
            .select("*")
            .eq("user_id", dbUser!.id)
            .maybeSingle();

          if (data) return data;

          const { data: inserted } = await supabase
            .from("loyalty_accounts")
            .upsert(
              {
                user_id: dbUser!.id,
                total_points: 0,
                lifetime_points: 0,
                tier: "cookie_lover",
              },
              { onConflict: "user_id" },
            )
            .select("*")
            .single();

          return inserted ?? null;
        })(),
      !supabase
        ? Promise.resolve([])
        : supabase
          .from("wishlists")
          .select(
            "id, created_at, product:products(id,slug,name,title_en,title_ar,price_egp,image_url,images,is_active)",
          )
          .eq("user_id", dbUser!.id)
          .order("created_at", { ascending: false })
          .limit(6)
          .then((r) => r.data ?? []),
      !supabase
        ? Promise.resolve([])
        : supabase
          .from("addresses")
          .select(
            "id, label, recipient, phone, city, governorate, street, is_default",
          )
          .eq("user_id", dbUser!.id)
          .order("created_at", { ascending: false })
          .limit(3)
          .then((r) => r.data ?? []),
      !supabase
        ? Promise.resolve([])
        : supabase
          .from("notifications_log")
          .select("id, title, body, href, created_at")
          .eq("recipient_user_id", dbUser!.id)
          .order("created_at", { ascending: false })
          .limit(3)
          .then((r) => r.data ?? []),
      !supabase
        ? Promise.resolve([])
        : supabase
          .from("customer_testimonials")
          .select("id, rating, comment, status, created_at")
          .eq("user_id", dbUser!.id)
          .order("created_at", { ascending: false })
          .limit(8)
          .then((r) => r.data ?? []),
    ]);

  const loyaltyPoints = Number(loyaltyAccount?.total_points ?? dbUser?.points ?? 0);
  const loyaltyTier: string = loyaltyAccount?.tier ?? "cookie_lover";
  const nextTierPoints =
    loyaltyTier === "cookie_monster"
      ? 0
      : loyaltyTier === "cruncher"
        ? Math.max(0, 1000 - loyaltyPoints)
        : Math.max(0, 500 - loyaltyPoints);
  const loyaltyThreshold =
    loyaltyTier === "cookie_monster" ? 1 : loyaltyTier === "cruncher" ? 1000 : 500;
  const loyaltyProgressPercent =
    loyaltyTier === "cookie_monster"
      ? 100
      : Math.min(100, (loyaltyPoints / loyaltyThreshold) * 100);

  const getProductImage = (p?: WishlistProduct | null): string | null => {
    if (typeof p?.image_url === "string" && p.image_url) return p.image_url;
    if (Array.isArray(p?.images) && p.images.length > 0 && p.images[0]?.url) {
      return String(p.images[0].url);
    }
    return null;
  };

  const tierLabel =
    loyaltyTier === "cookie_monster"
      ? "Cookie Monster"
      : loyaltyTier === "cruncher"
        ? "Cruncher"
        : "Cookie Lover";

  return (
    <div className="bg-cb-cream pb-20 pt-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 cb-gutter lg:flex-row">
        <aside className="w-full shrink-0 space-y-6 lg:w-72">
          <div className="rounded-3xl bg-cb-surface p-6 shadow-sm ring-1 ring-cb-border">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-full bg-cb-peach ring-2 ring-cb-peach-deep">
                {user?.imageUrl ? (
                  <Image
                    src={user.imageUrl}
                    alt={fullName}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-base font-bold text-cb-terracotta-dark"
                    aria-hidden
                  >
                    {(fullName || email || "?").trim().slice(0, 1).toUpperCase() ||
                      "?"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-cb-text-strong">{fullName}</p>
                {email && (
                  <p className="truncate text-xs text-cb-text-muted">{email}</p>
                )}
                <span
                  className={cn(
                    "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    accountRoleBadgeClass(accountRole),
                  )}
                >
                  <Star className="h-3 w-3 fill-current" aria-hidden />
                  {accountRole === "customer" ? "Member" : getRoleLabel(accountRole)}
                </span>
              </div>
            </div>
          </div>
          <nav
            className="rounded-3xl bg-cb-surface p-3 shadow-sm ring-1 ring-cb-border"
            aria-label="Account"
          >
            <ul className="space-y-1">
              {customerNavItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                      "text-cb-text hover:bg-cb-peach/60 hover:text-cb-text-strong",
                      "dark:hover:bg-cb-hover-overlay",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              ))}
              {adminSidebarLinks.length > 0 ? (
                <>
                  <li
                    className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-cb-text-muted"
                    aria-hidden
                  >
                    Admin / الإدارة
                  </li>
                  {adminSidebarLinks.map((navItem) => {
                    const AdminIcon = getAdminNavIcon(navItem);
                    return (
                      <li key={navItem.href}>
                        <Link
                          href={navItem.href}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                            "text-cb-text-strong ring-1 ring-cb-border/60 hover:bg-cb-peach/50 hover:ring-cb-border-strong",
                            "dark:hover:bg-cb-surface-2",
                          )}
                        >
                          <AdminIcon className="h-4 w-4 shrink-0 text-cb-terracotta-dark" aria-hidden />
                          {navItem.label}
                        </Link>
                      </li>
                    );
                  })}
                </>
              ) : null}
              <li>
                <SignOutButton redirectUrl="/">
                  {
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" aria-hidden />
                      Logout
                    </button>
                  }
                </SignOutButton>
              </li>
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-8">
          <section
            className={cn(
              "rounded-3xl border border-cb-peach-deep/50 bg-gradient-to-br from-cb-surface via-cb-cream to-cb-peach/30 p-6 shadow-sm ring-1 ring-cb-border/50",
              "dark:from-cb-surface-elevated dark:via-cb-surface dark:to-cb-peach-deep/20",
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-cb-terracotta-dark">
                  {accountRole === "customer" ? "Member" : getRoleLabel(accountRole)}
                </p>
                <h2 className="mt-1 font-serif text-xl font-semibold text-cb-text-strong sm:text-2xl">
                  {roleCopy.titleEn}
                  <span className="mt-1 block text-base font-normal text-cb-text-muted sm:text-lg">
                    {roleCopy.titleAr}
                  </span>
                </h2>
              </div>
              {accountRole !== "customer" ? (
                <Link
                  href="/admin"
                  className={buttonClassName(
                    "primary",
                    "shrink-0 self-start rounded-full px-6 py-3 text-sm",
                  )}
                >
                  Admin console / لوحة الإدارة
                </Link>
              ) : null}
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {roleCopy.perksEn.map((en, i) => (
                <li
                  key={en}
                  className="rounded-2xl bg-cb-surface/90 p-4 ring-1 ring-cb-border/50 dark:bg-cb-surface-2/80"
                >
                  <p className="text-sm font-medium text-cb-text-strong">{en}</p>
                  <p className="mt-1 text-xs leading-relaxed text-cb-text-muted">
                    {roleCopy.perksAr[i] ?? ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="overflow-hidden rounded-3xl bg-cb-surface-elevated shadow-sm ring-1 ring-cb-border">
            <div className="grid gap-6 p-6 lg:grid-cols-2 lg:items-center">
              <div>
                <h1 className="font-serif text-3xl font-semibold text-cb-text-strong">
                  Welcome back, {user?.firstName ?? fullName}!
                </h1>
                <p className="mt-2 text-cb-text-muted">
                  {accountRole !== "customer"
                    ? "Your member overview below — use the admin links for store operations."
                    : "Here's what's happening with your Cookie Bite orders, rewards, and saved items."}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "Orders", value: String(orders.length), icon: Package },
                    { label: "Points", value: String(loyaltyPoints), icon: Star },
                    { label: "Addresses", value: String(addressesItems.length), icon: MapPin },
                    { label: "Wishlist", value: String(wishlistItems.length), icon: Heart },
                  ].map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="rounded-2xl bg-cb-cream px-3 py-4 text-center ring-1 ring-cb-border/40"
                    >
                      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-cb-surface shadow-sm ring-1 ring-cb-border/60">
                        <Icon className="h-4 w-4 text-cb-terracotta-dark" aria-hidden />
                      </div>
                      <p className="mt-3 text-2xl font-bold text-cb-terracotta-dark">
                        {value}
                      </p>
                      <p className="text-xs text-cb-text-muted">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-cb-peach/40">
                <Image
                  src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80"
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, (max-width:1280px) 50vw, 40vw"
                />
              </div>
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section
              id="orders"
              className="rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-cb-text-strong">Recent orders</h2>
                  <p className="mt-1 text-xs text-cb-text-muted">
                    {orders.length
                      ? `Showing ${orders.length} recent orders`
                      : "No orders yet"}
                  </p>
                </div>
                <Link
                  href="/shop"
                  className="text-xs font-semibold text-cb-terracotta-dark hover:underline"
                >
                  Explore
                </Link>
              </div>

              {orders.length ? (
                <ul className="space-y-3">
                  {orders.map((o) => {
                    const invoiceNumber = `INV-${String(o.order_number).padStart(8, "0")}`;
                    return (
                      <li
                        key={o.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cb-border px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-cb-text-strong">
                            Order #{o.order_number}
                          </p>
                          <p className="mt-1 text-xs text-cb-text-muted">
                            {Number(o.total_egp).toFixed(0)} EGP · {o.payment_status}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/invoices/${invoiceNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-cb-border bg-cb-surface px-3 py-1 text-[11px] font-semibold text-cb-text-strong transition hover:bg-cb-peach/40"
                            title="View styled invoice"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Invoice
                          </Link>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                              STATUS_BADGE[o.status] ?? "bg-slate-100 text-slate-800",
                            )}
                          >
                            {o.status}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="rounded-2xl bg-cb-cream p-6 text-center">
                  <p className="text-sm font-semibold text-cb-text-strong">
                    No orders yet
                  </p>
                  <p className="mt-1 text-xs text-cb-text-muted">
                    Explore the shop and your first box will appear here.
                  </p>
                  <Link
                    href="/shop"
                    className={buttonClassName("primary", "mt-4 inline-flex")}
                  >
                    Start shopping
                  </Link>
                </div>
              )}
            </section>

            <section
              id="rewards"
              className="rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-cb-text-strong">
                    Rewards & points
                  </h2>
                  <p className="mt-1 text-xs text-cb-text-muted">
                    Tier:{" "}
                    <span className="font-semibold text-cb-terracotta-dark">
                      {tierLabel}
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl bg-cb-cream px-3 py-2 ring-1 ring-cb-border/40">
                  <p className="text-sm font-semibold text-cb-text-muted">
                    Total
                  </p>
                  <p className="text-lg font-bold text-cb-terracotta-dark">
                    {loyaltyPoints} pts
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <progress
                  className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-cb-peach [&::-webkit-progress-value]:bg-cb-terracotta-dark [&::-moz-progress-bar]:bg-cb-terracotta-dark"
                  value={Math.round(loyaltyProgressPercent)}
                  max={100}
                />
              </div>

              <p className="mt-2 text-xs text-cb-text-muted">
                {loyaltyTier === "cookie_monster"
                  ? "You’re at the top tier."
                  : `Next tier in ${nextTierPoints} pts`}
              </p>

              <RedeemPointsCard points={loyaltyPoints} />
            </section>
          </div>

          <section
            id="addresses"
            className="rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-cb-text-strong">
                  My addresses
                </h2>
                <p className="mt-1 text-xs text-cb-text-muted">
                  {addressesItems.length
                    ? `Saved: ${addressesItems.length}`
                    : "No saved addresses yet"}
                </p>
              </div>
              <Link
                href="/checkout"
                className="text-xs font-semibold text-cb-terracotta-dark hover:underline"
              >
                Add
              </Link>
            </div>

            {addressesItems.length ? (
              <div className="space-y-3">
                {(addressesItems as AddressItem[]).map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-cb-border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-cb-text-strong">
                        {a.label ?? a.recipient ?? "Address"}
                      </p>
                      {a.is_default ? (
                        <span className="rounded-full bg-cb-peach px-2 py-0.5 text-[10px] font-bold text-cb-terracotta-dark">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-cb-text-muted">
                      {a.recipient} · {a.phone}
                    </p>
                    <p className="mt-1 text-xs text-cb-text-muted">
                      {a.street}, {a.city ?? a.governorate}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-cb-cream p-6 text-center">
                <p className="text-sm font-semibold text-cb-text-strong">
                  Ready for delivery?
                </p>
                <p className="mt-1 text-xs text-cb-text-muted">
                  Add your address during checkout to speed up future orders.
                </p>
              </div>
            )}
          </section>

          <section
            id="pay"
            className="rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-cb-text-strong">
                  Payment methods
                </h2>
                <p className="mt-1 text-xs text-cb-text-muted">
                  Choose the payment method you prefer at checkout.
                </p>
              </div>
              <Link
                href="/checkout"
                className="text-xs font-semibold text-cb-terracotta-dark hover:underline"
              >
                Checkout
              </Link>
            </div>
            <div className="rounded-2xl bg-cb-cream p-4 ring-1 ring-cb-border/40">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-cb-surface ring-1 ring-cb-border/60">
                  <CreditCard className="h-5 w-5 text-cb-terracotta-dark" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cb-text-strong">
                    Available payments
                  </p>
                  <p className="mt-1 text-xs text-cb-text-muted">
                    Online payments when available, or Cash on Delivery (COD).
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["card", "wallet", "cod"].map((k) => {
                      const label = k === "cod" ? "COD" : k.toUpperCase();
                      return (
                        <span
                          key={k}
                          className="rounded-full bg-cb-surface-elevated px-3 py-1 text-[11px] font-semibold text-cb-terracotta-dark ring-1 ring-cb-border/60"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            id="notifications"
            className="rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-cb-text-strong">
                  Notifications
                </h2>
                <p className="mt-1 text-xs text-cb-text-muted">
                  {notificationsItems.length
                    ? `Recent: ${notificationsItems.length}`
                    : "No notifications yet"}
                </p>
              </div>
              <Link
                href="/contact"
                className="text-xs font-semibold text-cb-terracotta-dark hover:underline"
              >
                Support
              </Link>
            </div>

            {notificationsItems.length ? (
              <ul className="space-y-3">
                {(notificationsItems as NotificationItem[]).map((n) => (
                  <li
                    key={n.id}
                    className="rounded-2xl border border-cb-border p-4"
                  >
                    <p className="text-sm font-semibold text-cb-text-strong">
                      {n.title ?? "Update"}
                    </p>
                    <p className="mt-1 text-xs text-cb-text-muted">
                      {n.body ?? ""}
                    </p>
                    <p className="mt-2 text-[11px] text-cb-text-muted">
                      {n.created_at
                        ? new Date(n.created_at).toLocaleString()
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl bg-cb-cream p-6 text-center">
                <p className="text-sm font-semibold text-cb-text-strong">
                  All quiet.
                </p>
                <p className="mt-1 text-xs text-cb-text-muted">
                  We’ll notify you about order updates and loyalty rewards.
                </p>
              </div>
            )}
          </section>


          <AccountTestimonialForm
            enabled={Boolean(dbUser)}
            initialItems={(testimonialItems as TestimonialItem[]).map((t) => ({
              id: t.id,
              rating: Number(t.rating ?? 5),
              comment: t.comment ?? "",
              status: t.status ?? "pending",
              created_at: t.created_at ?? null,
            }))}
          />

          <section
            id="wish"
            className="rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-cb-text-strong">Wishlist</h2>
                <p className="mt-1 text-xs text-cb-text-muted">
                  {wishlistItems.length
                    ? `Saved: ${wishlistItems.length}`
                    : "Nothing saved yet"}
                </p>
              </div>
              <Link
                href="/shop"
                className="text-xs font-semibold text-cb-terracotta-dark hover:underline"
              >
                Browse
              </Link>
            </div>

            {wishlistItems.length ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {(wishlistItems as WishlistItem[]).map((w) => {
                  const p = w.product;
                  const img = getProductImage(p);
                  const title =
                    p?.title_ar ?? p?.title_en ?? p?.name ?? p?.slug ?? "Product";
                  const slug = p?.slug;
                  return (
                    <Link
                      key={w.id}
                      href={slug ? `/shop/${slug}` : "/shop"}
                      className="group rounded-2xl border border-cb-border p-3 transition hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-3">
                        {img ? (
                          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-cb-peach/40">
                            <Image
                              src={img}
                              alt={title}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-cb-peach/40 text-xs font-bold text-cb-terracotta-dark">
                            CB
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-cb-text-strong">
                            {title}
                          </p>
                          <p className="mt-1 text-xs font-bold text-cb-terracotta-dark">
                            {p?.price_egp != null ? `${p.price_egp} EGP` : ""}
                          </p>
                        </div>
                        <Heart className="h-4 w-4 shrink-0 text-cb-terracotta-dark" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl bg-cb-cream p-6 text-center">
                <p className="text-sm font-semibold text-cb-text-strong">
                  Save your favorites
                </p>
                <p className="mt-1 text-xs text-cb-text-muted">
                  Tap the heart on products to keep them here.
                </p>
                <Link
                  href="/shop"
                  className={buttonClassName("primary", "mt-4 inline-flex")}
                >
                  Explore products
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
