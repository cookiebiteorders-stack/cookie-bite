"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Gift,
  Heart,
  Home,
  type LucideIcon,
  ShoppingBag,
  User,
} from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type MobileTab = {
  href: string;
  label: string;
  Icon: LucideIcon;
  match: (p: string, hash?: string) => boolean;
  elevated?: boolean;
};

const tabs: MobileTab[] = [
  {
    href: "/",
    label: "Home",
    Icon: Home,
    match: (p: string) => p === "/",
  },
  {
    href: "/shop",
    label: "Shop",
    Icon: ShoppingBag,
    match: (p: string) => p.startsWith("/shop"),
  },
  {
    href: "/gift-ideas",
    label: "Gifts",
    Icon: Gift,
    elevated: true,
    match: (p: string) =>
      p.startsWith("/gift-ideas") || p.startsWith("/gift-box"),
  },
  {
    href: "/account#wish",
    label: "Saved",
    Icon: Heart,
    match: (p: string, hash = "") =>
      p.startsWith("/account") && hash === "#wish",
  },
  {
    href: "/account",
    label: "Account",
    Icon: User,
    match: (p: string, hash = "") =>
      p.startsWith("/account") && hash !== "#wish",
  },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const { t } = useLanguage();

  useEffect(() => {
    const sync = () => setHash(typeof window !== "undefined" ? window.location.hash : "");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);
  const localizedTabs: MobileTab[] = [
    { ...tabs[0], label: t("tabs.home") },
    { ...tabs[1], label: t("tabs.shop") },
    { ...tabs[2], label: t("tabs.gifts") },
    { ...tabs[3], label: t("tabs.saved") },
    { ...tabs[4], label: t("tabs.account") },
  ];

  return (
    <nav
      className="mobile-tab-bar cb-pl-mobile-nav"
      aria-label={t("tabs.mainNavigation")}
    >
      <div className="mobile-tab-bar__inner">
        {localizedTabs.map((tab) => {
          const active = tab.match(pathname, hash);
          const Icon = tab.Icon;

          if (tab.elevated) {
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className="mobile-tab-bar__tab mobile-tab-bar__tab--center"
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : undefined}
              >
                <span className="mobile-tab-bar__fab mobile-tab-bar__tap">
                  <Icon className="mobile-tab-bar__fab-icon" aria-hidden />
                </span>
                <span
                  className={cn(
                    "mobile-tab-bar__label mobile-tab-bar__label--fab",
                    active && "mobile-tab-bar__label--active",
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className="mobile-tab-bar__tab"
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              data-active={active ? "true" : undefined}
            >
              <span
                className={cn(
                  "mobile-tab-bar__icon-wrap mobile-tab-bar__tap",
                  active && "mobile-tab-bar__icon-wrap--active",
                )}
              >
                <Icon
                  className={cn(
                    "mobile-tab-bar__icon",
                    active && "mobile-tab-bar__icon--active",
                  )}
                  fill={active ? "currentColor" : "none"}
                  aria-hidden
                />
              </span>
              <span
                className={cn(
                  "mobile-tab-bar__label",
                  active && "mobile-tab-bar__label--active",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
