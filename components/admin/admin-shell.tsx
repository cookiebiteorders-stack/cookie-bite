"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";
import { type UserRole, getRoleLabel } from "@/lib/admin/rbac";
import { getAccessibleAdminConsoleNav } from "@/lib/admin/admin-console-nav";
import { getAdminNavIcon } from "@/lib/admin/admin-console-nav-icons";
import { useLanguage } from "@/components/providers/language-provider";

type AdminShellProps = {
  role: UserRole;
  children: React.ReactNode;
};

export function AdminShell({ role, children }: AdminShellProps) {
  const pathname = usePathname();
  const navItems = getAccessibleAdminConsoleNav(role);
  const { t } = useLanguage();

  return (
    <div className="admin-console cb-touch-manipulation relative z-[1] min-h-screen overflow-x-clip bg-background text-foreground">
      <a href="#admin-main-content" className="cb-skip-link">
        {t("actions.skipToMain")}
      </a>
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-cb-border bg-cb-surface-2 px-4 py-6 backdrop-blur-md lg:min-h-screen">
          <div className="mb-8 rounded-2xl border border-cb-border bg-cb-surface p-4 shadow-sm cb-shadow-editorial">
            <div className="flex items-center gap-2">
              <LogoMark className="h-9 w-9 text-cb-brand-logo" title="Cookie Bite" />
              <p className="font-playful text-2xl leading-none text-cb-brand-logo">
                Cookie Bite
              </p>
            </div>
            <p className="mt-2 text-xs font-semibold tracking-[0.16em] text-cb-text">
              ADMIN CONSOLE
            </p>
            <span className="mt-3 inline-flex rounded-full border border-cb-border-strong bg-cb-peach/50 px-3 py-1 text-xs font-bold text-cb-text-strong">
              {getRoleLabel(role)}
            </span>
          </div>

          <nav className="space-y-1" aria-label="Admin navigation">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = getAdminNavIcon(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
        </aside>

        <div className="min-w-0">


          <main id="admin-main-content" className="border-t border-transparent px-4 py-6 sm:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
