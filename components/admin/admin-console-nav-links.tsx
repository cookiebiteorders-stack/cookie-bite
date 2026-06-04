"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { getAdminNavIcon } from "@/lib/admin/admin-console-nav-icons";
import { useLanguage } from "@/components/providers/language-provider";
import type { AdminConsoleNavItem } from "@/lib/admin/admin-console-nav";

type AdminConsoleNavLinksProps = {
  items: AdminConsoleNavItem[];
  pathname: string;
  onNavigate?: () => void;
  className?: string;
};

export function AdminConsoleNavLinks({
  items,
  pathname,
  onNavigate,
  className,
}: AdminConsoleNavLinksProps) {
  const { t } = useLanguage();

  return (
    <nav
      className={cn("admin-console-nav flex w-full flex-col", className)}
      aria-label={t("adminShell.adminNavigation")}
    >
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
        const Icon = getAdminNavIcon(item);
        const label = t(`adminNav.${item.navKey}`);
        const isCopilot = item.navKey === "copilot";
        return (
          <Link
            key={`${item.href}-${item.navKey}`}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "admin-console-nav-link flex w-full min-h-[2.75rem] items-center gap-3 rounded-none px-4 py-2.5 text-sm font-semibold no-underline transition-colors duration-200",
              active
                ? "bg-cb-terracotta-dark text-white shadow-none hover:bg-cb-terracotta-dark hover:text-white hover:no-underline"
                : isCopilot
                  ? "bg-cb-peach/45 text-cb-text-strong hover:bg-cb-peach/70 hover:text-cb-text-strong hover:no-underline"
                  : "text-cb-text-strong hover:bg-cb-hover-overlay hover:text-cb-text-strong hover:no-underline",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
