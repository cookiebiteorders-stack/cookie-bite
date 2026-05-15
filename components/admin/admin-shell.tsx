"use client";

import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo-mark";
import { type UserRole, getRoleLabel } from "@/lib/admin/rbac";
import { getAccessibleAdminConsoleNav } from "@/lib/admin/admin-console-nav";
import { AdminConsoleNavLinks } from "@/components/admin/admin-console-nav-links";
import { AdminConsoleNavbar } from "@/components/admin/admin-console-navbar";
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
        <aside className="hidden border-r border-cb-border bg-cb-surface-2 px-4 py-6 backdrop-blur-md lg:block lg:min-h-screen">
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

          <AdminConsoleNavLinks items={navItems} pathname={pathname} />
        </aside>

        <div className="min-w-0">
          <AdminConsoleNavbar role={role} navItems={navItems} />

          <main id="admin-main-content" className="border-t border-transparent px-4 py-6 sm:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
