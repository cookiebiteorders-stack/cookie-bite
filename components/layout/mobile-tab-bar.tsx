"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gift,
  Heart,
  Home,
  type LucideIcon,
  ShoppingBag,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type MobileTab = {
  href: string;
  label: string;
  Icon: LucideIcon;
  match: (p: string) => boolean;
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
    href: "/shop?wishlist=1",
    label: "Saved",
    Icon: Heart,
    match: (p: string) => p === "/shop" && false, // placeholder
  },
  {
    href: "/account",
    label: "Account",
    Icon: User,
    match: (p: string) => p.startsWith("/account"),
  },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const localizedTabs: MobileTab[] = [
    { ...tabs[0], label: t("tabs.home") },
    { ...tabs[1], label: t("tabs.shop") },
    { ...tabs[2], label: t("tabs.gifts") },
    { ...tabs[3], label: t("tabs.saved") },
    { ...tabs[4], label: t("tabs.account") },
  ];

  return (
    <nav
      className="mobile-tab-bar"
      aria-label={t("tabs.mainNavigation")}
    >
      <div className="mobile-tab-bar__inner">
        {localizedTabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.Icon;

          if (tab.elevated) {
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className="mobile-tab-bar__tab mobile-tab-bar__tab--center"
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
              >
                <motion.span
                  className="mobile-tab-bar__fab"
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Icon className="mobile-tab-bar__fab-icon" aria-hidden />
                </motion.span>
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
            >
              <motion.span
                className="mobile-tab-bar__icon-wrap"
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                style={active ? { transform: "scale(1.08)" } : undefined}
              >
                <Icon
                  className={cn(
                    "mobile-tab-bar__icon",
                    active && "mobile-tab-bar__icon--active",
                  )}
                  fill={active ? "currentColor" : "none"}
                  aria-hidden
                />
              </motion.span>
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
