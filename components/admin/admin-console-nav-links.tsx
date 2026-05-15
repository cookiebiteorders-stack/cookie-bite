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
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-200",
              active
                ? "bg-cb-terracotta-dark text-white shadow-[var(--shadow-hover)]"
                : "text-cb-text-strong hover:bg-cb-hover-overlay hover:text-cb-text-strong",
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
