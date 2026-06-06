"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Store, X } from "lucide-react";
import { useEffect } from "react";
import { AdminConsoleNavLinks } from "@/components/admin/admin-console-nav-links";
import { useOptionalAdminConsole } from "@/components/admin/admin-console-context";
import { useLanguage } from "@/components/providers/language-provider";
/**
 * لوحة الإدارة — قائمة الجوال المنزلقة فقط (تُفتح من شريط الموقع الموحّد).
 */
export function AdminConsoleNavbar() {
  const pathname = usePathname();
  const ctx = useOptionalAdminConsole();
  const { t } = useLanguage();

  const adminNavOpen = ctx?.adminNavOpen ?? false;
  const setAdminNavOpen = ctx?.setAdminNavOpen;
  const navItems = ctx?.navItems ?? [];

  useEffect(() => {
    if (!adminNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [adminNavOpen]);

  if (!ctx || !adminNavOpen) return null;

  return (
    <div
      id="admin-mobile-nav"
      className="fixed inset-0 z-[110] lg:hidden"
      aria-hidden={false}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t("adminShell.closeAdminMenu")}
        onClick={() => setAdminNavOpen?.(false)}
      />
      <aside
        className="absolute inset-y-0 start-0 flex w-[min(100%,280px)] translate-x-0 flex-col border-e border-cb-border bg-cb-surface-2 py-4 shadow-xl rtl:translate-x-0"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-2 px-4">
          <div>
            <p className="font-playful text-xl text-cb-brand-logo">Cookie Bite</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cb-text-muted">
              {t("adminShell.consoleEyebrow")}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cb-border bg-cb-surface"
            onClick={() => setAdminNavOpen?.(false)}
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">{t("adminShell.close")}</span>
          </button>
        </div>
        <div className="admin-sidebar-scroll min-h-0 w-full flex-1 overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]">
          <AdminConsoleNavLinks
            items={navItems}
            pathname={pathname}
            onNavigate={() => setAdminNavOpen?.(false)}
          />
        </div>
        <Link
          href="/"
          className="mx-4 mt-3 inline-flex shrink-0 items-center gap-2 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm font-semibold text-cb-text-strong"
          onClick={() => setAdminNavOpen?.(false)}
        >
          <Store className="h-4 w-4" aria-hidden />
          {t("adminShell.backToStore")}
        </Link>
      </aside>
    </div>
  );
}
