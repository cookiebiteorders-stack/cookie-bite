"use client";

import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo-mark";
import { type UserRole } from "@/lib/admin/rbac";
import { getAccessibleAdminConsoleNav } from "@/lib/admin/admin-console-nav";
import { AdminConsoleNavLinks } from "@/components/admin/admin-console-nav-links";
import { AdminConsoleNavbar } from "@/components/admin/admin-console-navbar";
import { AdminConsoleProvider } from "@/components/admin/admin-console-context";
import { TopAnnouncementSlot } from "@/components/layout/top-announcement-slot";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { SiteHeader } from "@/components/layout/site-header";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartProvider } from "@/components/providers/cart-provider";
import { StaffAdminNavProvider } from "@/components/providers/staff-admin-nav-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { CopilotLauncher } from "@/components/admin/copilot/copilot-launcher";
import { canAccessMrsCookieCopilot } from "@/lib/admin/admin-console-nav";
import { DeferredTrackerBootstrap } from "@/components/tracking/deferred-tracker-bootstrap";
import { AdminPresenceBeacon } from "@/components/admin/admin-presence-beacon";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  role: UserRole;
  children: React.ReactNode;
};

export function AdminShell({ role, children }: AdminShellProps) {
  const pathname = usePathname();
  const navItems = getAccessibleAdminConsoleNav(role);
  const { t } = useLanguage();

  return (
    <StaffAdminNavProvider>
    <CartProvider>
      <AdminConsoleProvider role={role} navItems={navItems}>
        <div className="admin-console cb-touch-manipulation relative z-[1] flex min-h-screen w-full max-w-full flex-col overflow-x-clip bg-background text-foreground">
          <a href="#admin-main-content" className="cb-skip-link">
            {t("actions.skipToMain")}
          </a>
          <div className="cb-no-print">
            <TopAnnouncementSlot>
              <AnnouncementBar />
            </TopAnnouncementSlot>
          </div>

          <div className="desktop-header cb-no-print">
            <SiteHeader />
          </div>
          <div className="cb-header-spacer cb-header-spacer--desktop" aria-hidden />

          <div className="cb-no-print">
            <MobileHeader />
            <AdminConsoleNavbar />
          </div>

          <div className="min-h-0 w-full min-w-0 flex-1">
            <div className="mx-auto grid w-full min-w-0 max-w-[1600px] grid-cols-1 lg:grid-cols-[260px_1fr]">
              <aside
                className={cn(
                  "cb-no-print sticky top-[calc(4rem+var(--cb-announcement-offset,0px))] z-20 hidden h-[calc(100dvh-4rem-var(--cb-announcement-offset,0px))] max-h-[calc(100dvh-4rem-var(--cb-announcement-offset,0px))] flex-col overflow-hidden",
                  "border-r border-cb-border bg-cb-surface-2 py-4 backdrop-blur-md lg:flex",
                )}
              >
                <div className="mx-4 mb-4 shrink-0 rounded-2xl border border-cb-border bg-cb-surface p-4 shadow-sm cb-shadow-editorial">
                <div className="flex items-center gap-2">
                  <LogoMark className="h-9 w-9 text-cb-brand-logo" title="Cookie Bite" />
                  <p className="font-playful text-2xl leading-none text-cb-brand-logo">
                    Cookie Bite
                  </p>
                </div>
                <p className="mt-2 text-xs font-semibold tracking-[0.16em] text-cb-text">
                  {t("adminShell.consoleEyebrow")}
                </p>
                <span className="mt-3 inline-flex rounded-full border border-cb-border-strong bg-cb-peach/50 px-3 py-1 text-xs font-bold text-cb-text-strong">
                  {t(`adminRoles.${role}`)}
                </span>
              </div>

                <div className="admin-sidebar-scroll min-h-0 w-full flex-1 overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]">
                  <AdminConsoleNavLinks items={navItems} pathname={pathname} />
                </div>
              </aside>

            <div className="min-w-0 w-full max-w-full">
              <main
                id="admin-main-content"
                className="box-border w-full min-w-0 max-w-full overflow-x-clip border-t border-transparent px-4 py-6 sm:px-6"
              >
                {children}
              </main>
            </div>
          </div>
        </div>

        <CartDrawer />
        <AdminPresenceBeacon />
        <DeferredTrackerBootstrap />
        {canAccessMrsCookieCopilot(role) ? <CopilotLauncher /> : null}
        </div>
      </AdminConsoleProvider>
    </CartProvider>
    </StaffAdminNavProvider>
  );
}
