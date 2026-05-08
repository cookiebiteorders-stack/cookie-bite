import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import {
  Bell,
  CreditCard,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Star,
  User,
} from "lucide-react";
import { AccountProfilePanel } from "@/components/account/account-profile-panel";
import { buttonClassName } from "@/components/ui/button";
import { listRecentOrdersForUser } from "@/lib/db/orders";
import { getUserByClerkId, upsertUserFromClerk } from "@/lib/db/users";
import { PRODUCTS } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My Account",
};

const sidebar = [
  { label: "Dashboard", href: "/account", icon: LayoutDashboard, active: true },
  { label: "My Orders", href: "/account#orders", icon: Package },
  { label: "My Addresses", href: "/account#addresses", icon: MapPin },
  { label: "Payment Methods", href: "/account#pay", icon: CreditCard },
  { label: "Wishlist", href: "/account#wish", icon: Heart },
  { label: "Rewards & Points", href: "/account#rewards", icon: Star },
  { label: "Profile & security", href: "/account#profile", icon: User },
  { label: "Notifications", href: "/account#notifications", icon: Bell },
  { label: "Help & Support", href: "/contact", icon: HelpCircle },
];

const STATUS_BADGE: Record<string, string> = {
  delivered: "bg-emerald-100 text-emerald-800",
  shipped: "bg-amber-100 text-amber-800",
  processing: "bg-cb-peach text-cb-text-strong",
  pending: "bg-cb-peach text-cb-text-strong",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-slate-200 text-slate-800",
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in?redirect_url=/account");
  }

  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    email ||
    "Cookie Bite friend";

  let dbUser = email ? await getUserByClerkId(user.id) : null;
  if (!dbUser && email) {
    dbUser = await upsertUserFromClerk({
      clerkUserId: user.id,
      email,
      fullName,
      avatarUrl: user.imageUrl,
    });
  }

  const orders = dbUser ? await listRecentOrdersForUser(dbUser.id, 3) : [];

  return (
    <div className="bg-cb-cream pb-20 pt-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 cb-gutter lg:flex-row">
        <aside className="w-full shrink-0 space-y-6 lg:w-72">
          <div className="rounded-3xl bg-cb-surface p-6 shadow-sm ring-1 ring-cb-border">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-full bg-cb-peach ring-2 ring-cb-peach-deep">
                <Image
                  src={user.imageUrl}
                  alt={fullName}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-cb-text-strong">{fullName}</p>
                {email && (
                  <p className="truncate text-xs text-cb-text-muted">{email}</p>
                )}
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-cb-terracotta-dark px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  <Star className="h-3 w-3 fill-current" aria-hidden />
                  {dbUser && dbUser.role !== "customer"
                    ? dbUser.role.toUpperCase()
                    : "Member"}
                </span>
              </div>
            </div>
          </div>
          <nav
            className="rounded-3xl bg-cb-surface p-3 shadow-sm ring-1 ring-cb-border"
            aria-label="Account"
          >
            <ul className="space-y-1">
              {sidebar.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                      item.active
                        ? "border-l-4 border-cb-terracotta-dark bg-cb-peach text-cb-terracotta-dark"
                        : "text-cb-text hover:bg-cb-peach/60 hover:text-cb-text-strong",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <SignOutButton redirectUrl="/">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden />
                    Logout
                  </button>
                </SignOutButton>
              </li>
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-8">
          <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-cb-border">
            <div className="grid gap-6 p-6 lg:grid-cols-2 lg:items-center">
              <div>
                <h1 className="font-serif text-3xl font-semibold text-cb-text-strong">
                  Welcome back, {user.firstName ?? fullName}!
                </h1>
                <p className="mt-2 text-cb-text-muted">
                  Here&apos;s what&apos;s happening with your Cookie Bite orders and rewards.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "Orders", value: String(orders.length) },
                    { label: "Points", value: String(dbUser?.points ?? 0) },
                    { label: "Addresses", value: "0" },
                    { label: "Wishlist", value: "0" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl bg-cb-cream px-3 py-4 text-center"
                    >
                      <p className="text-2xl font-bold text-cb-terracotta-dark">
                        {s.value}
                      </p>
                      <p className="text-xs text-cb-text-muted">{s.label}</p>
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
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-cb-border"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-cb-text-strong">Recent orders</h2>
                <Link
                  href="/shop"
                  className="text-xs font-semibold text-cb-terracotta-dark hover:underline"
                >
                  View all
                </Link>
              </div>
              {orders.length ? (
                <ul className="space-y-3">
                  {orders.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between rounded-2xl border border-cb-border px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-cb-text-strong">
                          Order #{o.order_number}
                        </p>
                        <p className="text-xs text-cb-text-muted">
                          {Number(o.total_egp).toFixed(0)} EGP
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          STATUS_BADGE[o.status] ?? "bg-slate-100 text-slate-800",
                        )}
                      >
                        {o.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl bg-cb-cream p-6 text-center text-sm text-cb-text-muted">
                  No orders yet — explore the shop and your first box will appear here.
                </p>
              )}
            </section>

            <section
              id="rewards"
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-cb-border"
            >
              <h2 className="font-semibold text-cb-text-strong">Rewards & points</h2>
              <p className="mt-4 text-3xl font-bold text-cb-terracotta-dark">
                {dbUser?.points ?? 0} pts
              </p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-cb-peach">
                <div
                  className="h-full rounded-full bg-cb-terracotta-dark"
                  style={{
                    width: `${Math.min(100, ((dbUser?.points ?? 0) / 1000) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-cb-text-muted">
                {Math.max(0, 1000 - (dbUser?.points ?? 0))} points to your next free dozen.
              </p>
              <button
                type="button"
                className={buttonClassName("primary", "mt-6 w-full")}
              >
                Redeem points
              </button>
            </section>
          </div>

          <section
            id="profile"
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-cb-border"
          >
            <h2 className="mb-4 font-semibold text-cb-text-strong">
              Profile & security
            </h2>
            <p className="mb-6 text-sm text-cb-text-muted">
              Update your email, password, and connected accounts (managed by Clerk).
            </p>
            <AccountProfilePanel />
          </section>

          <section
            id="wish"
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-cb-border"
          >
            <h2 className="mb-4 font-semibold text-cb-text-strong">Wishlist</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {PRODUCTS.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl border border-cb-border p-3"
                >
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl">
                    <Image src={p.image} alt={p.name} fill className="object-cover" sizes="56px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs font-semibold text-cb-terracotta-dark">
                      {p.price} EGP
                    </p>
                  </div>
                  <Heart className="h-4 w-4 shrink-0 text-cb-terracotta-dark" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
