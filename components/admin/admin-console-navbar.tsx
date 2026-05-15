"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Menu, Store, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { AdminConsoleNavLinks } from "@/components/admin/admin-console-nav-links";
import { useLanguage } from "@/components/providers/language-provider";
import type { AdminConsoleNavItem } from "@/lib/admin/admin-console-nav";
import { getRoleLabel, type UserRole } from "@/lib/admin/rbac";
import { cn } from "@/lib/utils";

type AdminConsoleNavbarProps = {
  role: UserRole;
  navItems: AdminConsoleNavItem[];
};

function resolveCurrentPage(pathname: string, navItems: AdminConsoleNavItem[]) {
  const exact = navItems.find((item) => pathname === item.href);
  if (exact) return exact;
  return navItems.find(
    (item) => item.href !== "/admin" && pathname.startsWith(`${item.href}/`),
  );
}

export function AdminConsoleNavbar({ role, navItems }: AdminConsoleNavbarProps) {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPage = resolveCurrentPage(pathname, navItems);

  useEffect(() => {
    queueMicrotask(() => setMobileOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const storeLabel = lang === "ar" ? "المتجر" : "Store";
  const consoleLabel = lang === "ar" ? "لوحة الإدارة" : "Admin console";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-cb-border bg-cb-surface/95 shadow-sm backdrop-blur-md">
        <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cb-border bg-cb-surface text-cb-text-strong transition hover:bg-cb-hover-overlay lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="admin-mobile-nav"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            <span className="sr-only">{mobileOpen ? "Close admin menu" : "Open admin menu"}</span>
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <LogoMark className="h-8 w-8 shrink-0 text-cb-brand-logo lg:hidden" title="Cookie Bite" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-cb-text-strong">
                {currentPage?.label ?? "Dashboard"}
              </p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-cb-text-muted">
                {consoleLabel} · {getRoleLabel(role)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-semibold text-cb-text-strong transition hover:bg-cb-hover-overlay sm:inline-flex"
            >
              <Store className="h-4 w-4 shrink-0" aria-hidden />
              {storeLabel}
            </Link>
          <LanguageToggle />
          <ThemeToggle />
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-9 w-9 ring-2 ring-cb-border/80",
              },
            }}
          />
        </div>
        </div>
      </header>

      <div
        id="admin-mobile-nav"
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          aria-label="Close admin menu"
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 start-0 flex w-[min(100%,280px)] flex-col border-e border-cb-border bg-cb-surface-2 p-4 shadow-xl transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
          )}
        >
          <div className="mb-6 flex items-center justify-between gap-2">
            <div>
              <p className="font-playful text-xl text-cb-brand-logo">Cookie Bite</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cb-text-muted">
                {consoleLabel}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cb-border bg-cb-surface"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <AdminConsoleNavLinks
            items={navItems}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm font-semibold text-cb-text-strong"
            onClick={() => setMobileOpen(false)}
          >
            <Store className="h-4 w-4" aria-hidden />
            {storeLabel}
          </Link>
        </aside>
      </div>
    </>
  );
}
