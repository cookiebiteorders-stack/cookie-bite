"use client";

import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Package,
  Settings,
  Star,
} from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { useStaffAdminNav } from "@/components/providers/staff-admin-nav-provider";
import { getAdminNavIcon } from "@/lib/admin/admin-console-nav-icons";
import type { AdminConsoleNavItem } from "@/lib/admin/admin-console-nav";
import { cn } from "@/lib/utils";

const customerNavItems = [
  { key: "dashboard", href: "/account", icon: LayoutDashboard },
  { key: "settings", href: "/account/settings", icon: Settings },
  { key: "orders", href: "/account#orders", icon: Package },
  { key: "addresses", href: "/account#addresses", icon: MapPin },
  { key: "pay", href: "/account#pay", icon: CreditCard },
  { key: "wishlist", href: "/account#wish", icon: Heart },
  { key: "rewards", href: "/account#rewards", icon: Star },
  { key: "feedback", href: "/account#feedback", icon: MessageSquare },
  { key: "notifications", href: "/account#notifications", icon: Bell },
  { key: "help", href: "/contact", icon: HelpCircle },
] as const;

type AccountSidebarProps = {
  userName: string;
  userEmail?: string | null;
  avatarUrl?: string | null;
  roleLabel?: string;
  showAdminLinks?: boolean;
  /** عناصر لوحة الإدارة من الخادم (تفضّل على fetch العميل لتجنّب تكرار التسميات). */
  adminConsoleLinks?: AdminConsoleNavItem[];
};

export function AccountSidebar({
  userName,
  userEmail,
  avatarUrl,
  roleLabel = "Member",
  showAdminLinks = false,
  adminConsoleLinks = [],
}: AccountSidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { items: staffAdminNavItems } = useStaffAdminNav();
  const adminLinks: AdminConsoleNavItem[] =
    adminConsoleLinks.length > 0
      ? adminConsoleLinks
      : staffAdminNavItems.map((item) => ({
          href: item.href,
          navKey: item.navKey,
          module: item.module,
        }));

  const labels: Record<(typeof customerNavItems)[number]["key"], string> = {
    dashboard: t("accountNav.dashboard"),
    settings: t("accountNav.settings"),
    orders: t("accountNav.orders"),
    addresses: t("accountNav.addresses"),
    pay: t("accountNav.payment"),
    wishlist: t("accountNav.wishlist"),
    rewards: t("accountNav.rewards"),
    feedback: t("accountNav.comments"),
    notifications: t("accountNav.notifications"),
    help: t("accountNav.help"),
  };

  return (
    <aside className="w-full shrink-0 space-y-6 lg:w-72">
      <div className="rounded-3xl bg-cb-surface p-6 shadow-sm ring-1 ring-cb-border">
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cb-peach ring-2 ring-cb-peach-deep">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-bold text-cb-terracotta-dark" aria-hidden>
                {(userName || "?").trim().slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-cb-text-strong">{userName}</p>
            {userEmail ? (
              <p className="truncate text-xs text-cb-text-muted">{userEmail}</p>
            ) : null}
            <span className="mt-2 inline-flex rounded-full bg-cb-peach/60 px-2 py-0.5 text-[10px] font-bold uppercase text-cb-terracotta-dark">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      <nav
        className="rounded-3xl bg-cb-surface p-3 shadow-sm ring-1 ring-cb-border"
        aria-label={t("accountNav.aria")}
      >
        <ul className="space-y-1">
          {customerNavItems.map((item) => {
            const active =
              item.href === "/account/settings"
                ? pathname.startsWith("/account/settings")
                : item.href === "/account"
                  ? pathname === "/account"
                  : false;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                    active
                      ? "bg-cb-terracotta-dark text-white shadow-sm"
                      : "text-cb-text hover:bg-cb-peach/60 hover:text-cb-text-strong dark:hover:bg-cb-hover-overlay",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                  {labels[item.key]}
                </Link>
              </li>
            );
          })}
          {showAdminLinks && adminLinks.length > 0 ? (
            <>
              <li
                className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-cb-text-muted"
                aria-hidden
              >
                {t("accountNav.adminSection")}
              </li>
              {adminLinks.map((navItem) => {
                const AdminIcon = getAdminNavIcon(navItem);
                return (
                  <li key={`${navItem.href}-${navItem.navKey}`}>
                    <Link
                      href={navItem.href}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-cb-text-strong ring-1 ring-cb-border/60 hover:bg-cb-peach/50"
                    >
                      <AdminIcon className="h-4 w-4 shrink-0 text-cb-terracotta-dark" aria-hidden />
                      {t(`adminNav.${navItem.navKey}`)}
                    </Link>
                  </li>
                );
              })}
            </>
          ) : null}
          <li>
            <SignOutButton redirectUrl="/">
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                {t("userMenu.signOut")}
              </button>
            </SignOutButton>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
