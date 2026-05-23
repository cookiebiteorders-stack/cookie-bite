"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { getAdminNavIcon } from "@/lib/admin/admin-console-nav-icons";
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
  return (
    <nav className={cn("space-y-1", className)} aria-label="Admin navigation">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
        const Icon = getAdminNavIcon(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "admin-console-nav-link flex min-h-[2.5rem] items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold no-underline transition-colors duration-200",
              active
                ? "bg-cb-terracotta-dark text-white shadow-[var(--shadow-hover)] hover:bg-cb-terracotta-dark hover:text-white hover:no-underline"
                : "text-cb-text-strong hover:bg-cb-hover-overlay hover:text-cb-text-strong hover:no-underline",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
