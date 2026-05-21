"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  ChevronDown,
  Gift,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  UserRound,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { useStaffAdminNav } from "@/components/providers/staff-admin-nav-provider";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/data";
import { duration, easeSoft } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";

const triggerBtn =
  "cb-touch-manipulation inline-flex h-11 min-h-[2.75rem] items-center gap-1.5 rounded-xl border border-cb-border bg-cb-surface/80 px-2 pe-2.5 text-cb-text-strong shadow-sm backdrop-blur-sm transition-[transform,box-shadow,background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-cb-terracotta-dark/35 hover:bg-cb-peach/45 hover:shadow-md active:scale-[0.98] dark:border-cb-border dark:bg-cb-surface-2/90 dark:hover:bg-cb-peach/20";

const menuSurface =
  "rounded-2xl border border-cb-border bg-cb-surface/98 py-1 shadow-[0_20px_50px_-12px_rgba(40,28,20,0.25)] backdrop-blur-xl dark:border-cb-border dark:bg-cb-surface-2/98 dark:shadow-[0_24px_56px_-8px_rgba(0,0,0,0.5)]";

/**
 * قائمة حساب مستخدم بنمط القالب المرفق، مدمجة مع Clerk وألوان Cookie Bite.
 */
export function UserAccountDropdown() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { t } = useLanguage();
  const { items: staffAdminNavItems } = useStaffAdminNav();
  const pathname = usePathname();
  const inAdminShell = pathname.startsWith("/admin");
  const showProfileAdminLinks = staffAdminNavItems.length > 0 && !inAdminShell;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!isLoaded || !user) {
    return (
      <span
        className={cn(triggerBtn, "pointer-events-none w-11 min-w-[2.75rem] justify-center opacity-45")}
        aria-hidden
      >
        <UserRound className="h-5 w-5 shrink-0" />
      </span>
    );
  }

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const displayName =
    user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || t("nav.account");
  const initials = (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "") || displayName.slice(0, 2).toUpperCase();


  return (
    <div ref={rootRef} className="relative z-[51] flex items-center">
      <button
        type="button"
        className={cn(triggerBtn, "ps-1.5")}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={open ? t("userMenu.closeMenu") : t("userMenu.openMenu")}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-cb-peach-deep/80 dark:ring-cb-border">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-cb-peach/60 text-xs font-bold text-cb-text-strong dark:bg-cb-surface-elevated dark:text-cb-cream-2">
              {initials}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-cb-text-muted transition-transform duration-300", open && "rotate-180")}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && mounted ? (
          <motion.div
            id={menuId}
            role="menu"
            aria-label={t("nav.account")}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: duration.short, ease: easeSoft }}
            className={cn(
              "absolute end-0 top-[calc(100%+0.5rem)] flex w-[min(calc(100vw-1.5rem),19.5rem)] max-h-[min(85vh,32rem)] flex-col origin-top",
              menuSurface,
            )}
          >
            <div className="shrink-0 border-b border-cb-border px-4 py-3 dark:border-cb-border">
              <div className="flex items-start gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-cb-peach-deep/70 dark:ring-cb-border">
                  {user.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-cb-peach/50 text-sm font-bold text-cb-text-strong dark:bg-cb-surface-elevated">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-base font-bold text-cb-text-strong">{displayName}</p>
                  {email ? (
                    <p className="truncate text-xs text-cb-text-muted">{email}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]">
            <div className="border-b border-cb-border px-3 py-3 dark:border-cb-border">
              <div className="rounded-xl border border-cb-border/80 bg-cb-cream/90 px-3 py-3 dark:border-cb-border dark:bg-cb-surface-elevated/90">
                <p className="text-[11px] font-bold uppercase tracking-wide text-cb-terracotta-dark dark:text-cb-terracotta">
                  {SITE.name}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-cb-text">{t("userMenu.rewardsBlurb")}</p>
              </div>
            </div>

            <div className="py-1">
              <Link
                href="/account"
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-cb-text-strong transition-colors hover:bg-cb-peach/45 dark:hover:bg-cb-peach/15"
                onClick={close}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0 text-cb-terracotta-dark dark:text-cb-terracotta" aria-hidden />
                {t("userMenu.dashboard")}
              </Link>
              <Link
                href="/account/settings"
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-cb-text-strong transition-colors hover:bg-cb-peach/45 dark:hover:bg-cb-peach/15"
                onClick={close}
              >
                <Settings className="h-4 w-4 shrink-0 text-cb-text-muted" aria-hidden />
                {t("userMenu.settings")}
              </Link>
              <Link
                href="/gift-box"
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-cb-text-strong transition-colors hover:bg-cb-peach/45 dark:hover:bg-cb-peach/15"
                onClick={close}
              >
                <Gift className="h-4 w-4 shrink-0 text-cb-terracotta-dark dark:text-cb-terracotta" aria-hidden />
                {t("userMenu.giftBox")}
              </Link>
            </div>

            {showProfileAdminLinks ? (
              <div className="border-b border-cb-border px-3 py-2 dark:border-cb-border">
                <p className="mb-2 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-cb-text-muted">
                  <Shield className="h-3.5 w-3.5 text-cb-terracotta-dark dark:text-cb-terracotta" aria-hidden />
                  {t("nav.adminMenu")}
                </p>
                <div
                  className={cn(
                    "flex flex-col gap-0.5",
                    staffAdminNavItems.length > 5 &&
                      "max-h-[min(50vh,14rem)] overflow-y-auto overscroll-y-contain",
                  )}
                >
                  {staffAdminNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-cb-text-strong transition-colors hover:bg-cb-peach/45 dark:hover:bg-cb-peach/15"
                      onClick={close}
                    >
                      {t(`adminNav.${item.module}`)}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            </div>

            <div className="shrink-0 border-t border-cb-border dark:border-cb-border">
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                onClick={() => {
                  close();
                  void signOut({ redirectUrl: "/" });
                }}
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                {t("userMenu.signOut")}
              </button>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-cb-border px-4 py-2.5 dark:border-cb-border">
              <span className="truncate text-xs font-semibold text-cb-text-muted">{t("userMenu.brandFoot")}</span>
              <span className="hidden max-w-[9rem] truncate text-[10px] text-cb-text-muted/90 sm:inline">
                {SITE.tagline}
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
