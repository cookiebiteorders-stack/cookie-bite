"use client";

import { Show } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  ShoppingBag,
  Store,
  UserRound,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SiteLogoLink } from "@/components/brand/site-logo";
import { NavDropdown } from "@/components/layout/nav-dropdown";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useStaffAdminNav } from "@/components/providers/staff-admin-nav-provider";
import { duration, easeSoft, spring } from "@/lib/motion/presets";
import { UserAccountDropdown } from "@/components/ui/profile-dropdown";
import { useOptionalAdminConsole } from "@/components/admin/admin-console-context";
import { AdminConsoleNavLinks } from "@/components/admin/admin-console-nav-links";
import { resolveCurrentAdminConsolePage } from "@/lib/admin/admin-console-nav";
import { getRoleLabel } from "@/lib/admin/rbac";
import { cn } from "@/lib/utils";

const iconBtn =
  "cb-touch-manipulation inline-flex h-11 min-h-[2.75rem] w-11 min-w-[2.75rem] items-center justify-center rounded-xl text-cb-text transition-[transform,box-shadow,color,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-cb-hover-overlay hover:text-cb-terracotta-dark hover:shadow-sm active:scale-[0.97] dark:hover:bg-cb-peach/15";

const navLinkActive =
  "text-cb-text-strong underline decoration-[1.5px] underline-offset-[10px] decoration-cb-terracotta-dark/80 dark:decoration-cb-terracotta/70";

const storeNavGroupClass =
  "flex items-center gap-0.5 rounded-2xl border border-cb-border/50 bg-cb-surface-2/30 p-0.5 dark:border-cb-border/60 dark:bg-cb-surface-elevated/20";

const utilityGroupClass =
  "flex items-center gap-0.5 rounded-2xl border border-cb-border/50 bg-cb-surface-2/25 p-0.5 sm:gap-1 dark:border-cb-border/60";

export function SiteHeader() {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useCart();
  const { t, lang } = useLanguage();
  const { items: staffAdminNavItems } = useStaffAdminNav();
  const admin = useOptionalAdminConsole();
  const currentAdminPage = admin
    ? resolveCurrentAdminConsolePage(pathname, admin.navItems)
    : undefined;
  const consoleLabel = lang === "ar" ? "لوحة الإدارة" : "Admin console";
  const storeLabel = lang === "ar" ? "المتجر" : "Store";
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuToggleRef = useRef<HTMLButtonElement>(null);
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  /** قيم ثابتة في DOM لتمرير axe / Edge Tools (لا تعابير JSX على aria-expanded / aria-controls) */
  useLayoutEffect(() => {
    const el = mobileMenuToggleRef.current;
    if (!el) return;
    if (mobileOpen) {
      el.setAttribute("aria-expanded", "true");
      el.setAttribute("aria-controls", "site-mobile-nav");
    } else {
      el.setAttribute("aria-expanded", "false");
      el.removeAttribute("aria-controls");
    }
  }, [mobileOpen]);

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 28);
  });

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    queueMicrotask(() => setMobileOpen(false));
  }, [pathname]);

  const linkBase =
    "rounded-lg px-2.5 py-1.5 text-sm font-medium text-cb-text-strong transition-colors duration-300 hover:bg-cb-hover-overlay hover:text-cb-terracotta-dark dark:hover:text-cb-terracotta";

  const shopActive = pathname.startsWith("/shop");
  const giftsActive =
    pathname.startsWith("/gift-box") || pathname.startsWith("/gift-ideas");
  const isRtl = lang === "ar";
  const discoverLinks = useMemo(
    () => [
      { href: "/our-story", label: t("nav.ourStory") },
      { href: "/our-cookies", label: t("nav.ourCookies") },
      { href: "/blog", label: t("nav.blog") },
    ],
    [t],
  );
  const helpLinks = useMemo(
    () => [
      { href: "/help", label: t("nav.helpCenter") },
      { href: "/help/faq", label: t("nav.faq") },
      { href: "/help/returns", label: t("nav.returns") },
      { href: "/contact", label: t("nav.contact") },
    ],
    [t],
  );
  const adminNavForMenu = useMemo(
    () =>
      staffAdminNavItems.map((item) => ({
        href: item.href,
        label: t(`adminNav.${item.module}`),
      })),
    [staffAdminNavItems, t],
  );
  const adminNavActive = pathname.startsWith("/admin");
  const mobileFullLinks = useMemo(
    () => [
      { href: "/shop", label: t("nav.shop") },
      { href: "/gift-box", label: t("nav.gifts") },
      ...discoverLinks,
      ...helpLinks,
      { href: "/account", label: t("nav.account") },
    ],
    [t, discoverLinks, helpLinks],
  );

  return (
    <>
      <header
        className={cn(
          "cb-pl-navbar fixed start-0 end-0 top-0 z-50 w-full border-b transition-[border-color,background-color,box-shadow,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled ? "is-scrolled" : "",
          scrolled
            ? "border-[color:var(--color-border-soft)] bg-white shadow-[var(--shadow-pl-nav)] backdrop-blur-xl"
            : "border-[color:var(--cb-nav-border)] bg-[color:var(--cb-nav-blur)] backdrop-blur-md supports-[backdrop-filter]:bg-[color:var(--cb-nav-blur)]",
        )}
      >
        <div className="mx-auto w-full max-w-7xl cb-gutter">
          <div
            className={cn(
              "flex items-center justify-between gap-3 transition-[min-height] duration-500",
              scrolled ? "min-h-14 py-1.5" : "min-h-16 py-2",
            )}
          >
            <div className="flex min-w-0 items-center gap-2 lg:gap-3">
              <button
                ref={mobileMenuToggleRef}
                type="button"
                className={cn(iconBtn, "lg:hidden")}
                aria-haspopup="dialog"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" aria-hidden />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden />
                )}
              </button>
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <SiteLogoLink showTagline={!admin} className={admin ? "max-w-[min(180px,38vw)]" : undefined} />
                {admin ? (
                  <Link
                    href={currentAdminPage?.href ?? "/admin"}
                    className="hidden min-w-0 max-w-[9.5rem] flex-col justify-center rounded-xl border border-cb-border/60 bg-cb-surface-2/40 px-2.5 py-1.5 transition-colors hover:bg-cb-peach/25 sm:max-w-[11rem] md:flex lg:max-w-[12.5rem]"
                    title={consoleLabel}
                  >
                    <p className="truncate text-xs font-bold leading-tight text-cb-text-strong">
                      {currentAdminPage?.label ?? "Dashboard"}
                    </p>
                    <p className="truncate text-[9px] font-semibold uppercase leading-tight tracking-[0.14em] text-cb-terracotta-dark dark:text-cb-terracotta">
                      {getRoleLabel(admin.role)}
                    </p>
                  </Link>
                ) : null}
              </div>
            </div>

            <nav
              className="hidden min-w-0 flex-1 items-center justify-center px-2 lg:flex xl:px-4"
              aria-label={t("nav.primary")}
            >
              <div className={storeNavGroupClass}>
                <Link href="/shop" className={cn(linkBase, shopActive && navLinkActive)}>
                  {t("nav.shop")}
                </Link>
                <Link href="/gift-box" className={cn(linkBase, giftsActive && navLinkActive)}>
                  {t("nav.gifts")}
                </Link>
                <span className="mx-0.5 hidden h-5 w-px bg-cb-border/70 sm:block" aria-hidden />
                <NavDropdown label={t("nav.discover")} items={discoverLinks} />
                <NavDropdown label={t("nav.help")} items={helpLinks} />
              </div>
              {!admin && adminNavForMenu.length > 0 ? (
                <NavDropdown
                  className="ms-2 shrink-0"
                  label={t("nav.adminMenu")}
                  items={adminNavForMenu}
                  isActive={adminNavActive}
                  align="end"
                />
              ) : null}
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <div className={utilityGroupClass}>
                <LanguageToggle className="hidden md:inline-flex" />
              </div>
              {admin ? (
                <Link
                  href="/"
                  className={cn(
                    iconBtn,
                    "hidden gap-2 border border-cb-border/50 bg-cb-surface-2/30 px-3 sm:inline-flex sm:w-auto sm:min-w-0 sm:shrink-0 dark:border-cb-border/60",
                  )}
                  aria-label={storeLabel}
                >
                  <Store className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="hidden text-sm font-semibold lg:inline">{storeLabel}</span>
                </Link>
              ) : null}
              <span className="hidden h-6 w-px bg-cb-border/60 sm:block" aria-hidden />
              <Link href="/search" className={iconBtn} aria-label={t("actions.search")}>
                <Search className="h-5 w-5" aria-hidden />
              </Link>

              <Show when="signed-out">
                <Link
                  href="/sign-in"
                  className={iconBtn}
                  aria-label={t("actions.signIn")}
                >
                  <UserRound className="h-5 w-5" aria-hidden />
                </Link>
              </Show>

              <Show when="signed-in">
                <UserAccountDropdown />
              </Show>

              <button
                type="button"
                onClick={openDrawer}
                className={cn(iconBtn, "relative")}
                aria-label={
                  itemCount
                    ? t("actions.shoppingCartWithCount", { count: itemCount })
                    : t("actions.shoppingCart")
                }
              >
                <ShoppingBag className="h-5 w-5" aria-hidden />
                {itemCount > 0 ? (
                  <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cb-terracotta-dark px-1 text-[10px] font-bold text-white dark:bg-cb-terracotta dark:text-cb-cream-2">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

        </div>
      </header>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            id="site-mobile-nav"
            key="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label={admin ? `${t("nav.menu")} — ${consoleLabel} · ${storeLabel}` : t("nav.siteNavigation")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.short, ease: easeSoft }}
            className="fixed inset-0 z-[60] lg:hidden"
          >
            <button
              type="button"
              className="absolute inset-0 bg-cb-scrim-strong/65 backdrop-blur-[2px] dark:bg-black/60 max-sm:bg-cb-scrim-strong/75 max-sm:backdrop-blur-none"
              aria-label={t("nav.closeMenu")}
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ x: isRtl ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? "100%" : "-100%" }}
              transition={spring.snappy}
              className={cn(
                "absolute inset-y-0 start-0 flex w-[min(100vw-0.5rem,22rem)] max-w-[calc(100vw-env(safe-area-inset-left))] flex-col border-e border-cb-border bg-cb-surface/98 py-6 shadow-2xl backdrop-blur-xl dark:bg-cb-surface-2/98 max-sm:backdrop-blur-md",
              )}
              style={{
                paddingTop: "max(1.25rem, env(safe-area-inset-top))",
                paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
              }}
            >
              <div className="flex items-center justify-between border-b border-cb-border px-5 pb-4">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-cb-text-muted">
                  {t("nav.menu")}
                </span>
                <div className="flex items-center gap-2">
                  <LanguageToggle mobile />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-4">
                {admin ? (
                  <>
                    <div className="px-1 pb-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cb-text-muted">
                        {consoleLabel}
                      </p>
                    </div>
                    <AdminConsoleNavLinks
                      items={admin.navItems}
                      pathname={pathname}
                      onNavigate={() => setMobileOpen(false)}
                    />
                    <div
                      className="my-3 border-t border-cb-border px-1 pt-1 dark:border-cb-border"
                      role="separator"
                    />
                    <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cb-text-muted">
                      {storeLabel}
                    </p>
                  </>
                ) : null}
                {mobileFullLinks.map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      ...spring.gentle,
                      delay: 0.04 + i * 0.045,
                    }}
                  >
                    <Link
                      href={item.href}
                      className="cb-touch-manipulation flex min-h-[2.75rem] items-center rounded-xl px-4 py-3 text-base font-semibold text-cb-text-strong transition-colors hover:bg-cb-peach/50 active:bg-cb-peach/60 dark:hover:bg-cb-peach/20"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
                {!admin && staffAdminNavItems.length > 0 && adminNavForMenu.length > 0 ? (
                  <>
                    <div className="px-1 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cb-text-muted">
                        {t("nav.adminMenu")}
                      </p>
                    </div>
                    {staffAdminNavItems.map((item, j) => (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          ...spring.gentle,
                          delay: 0.04 + (mobileFullLinks.length + j) * 0.045,
                        }}
                      >
                        <Link
                          href={item.href}
                          className="cb-touch-manipulation flex min-h-[2.75rem] items-center rounded-xl px-4 py-3 text-base font-semibold text-cb-text-strong transition-colors hover:bg-cb-peach/50 active:bg-cb-peach/60 dark:hover:bg-cb-peach/20"
                          onClick={() => setMobileOpen(false)}
                        >
                          {t(`adminNav.${item.module}`)}
                        </Link>
                      </motion.div>
                    ))}
                  </>
                ) : null}
              </div>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
