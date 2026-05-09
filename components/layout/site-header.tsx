"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SiteLogoLink } from "@/components/brand/site-logo";
import { NavDropdown } from "@/components/layout/nav-dropdown";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { duration, easeSoft, spring } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";

const iconBtn =
  "cb-touch-manipulation inline-flex h-11 min-h-[2.75rem] w-11 min-w-[2.75rem] items-center justify-center rounded-xl text-cb-text transition-[transform,box-shadow,color,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-cb-hover-overlay hover:text-cb-terracotta-dark hover:shadow-sm active:scale-[0.97] dark:hover:bg-cb-peach/15";

export function SiteHeader() {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useCart();
  const { t, lang } = useLanguage();
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
    "text-sm font-medium text-cb-text-strong transition-colors duration-300 hover:text-cb-terracotta-dark dark:hover:text-cb-terracotta";

  const shopActive = pathname.startsWith("/shop");
  const giftsActive =
    pathname.startsWith("/gift-box") || pathname.startsWith("/gift-ideas");
  const isRtl = lang === "ar";
  const discoverLinks = [
    { href: "/our-story", label: t("nav.ourStory") },
    { href: "/our-cookies", label: t("nav.ourCookies") },
    { href: "/blog", label: t("nav.blog") },
  ];
  const helpLinks = [
    { href: "/contact", label: t("nav.contact") },
    { href: "/help/faq", label: t("nav.faq") },
    { href: "/help/returns", label: t("nav.returns") },
  ];
  const mobileFullLinks = [
    { href: "/shop", label: t("nav.shop") },
    { href: "/gift-box", label: t("nav.gifts") },
    ...discoverLinks,
    ...helpLinks,
    { href: "/account", label: t("nav.account") },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-50 w-full border-b transition-[border-color,background-color,box-shadow,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled
            ? "border-cb-border/90 bg-[color:var(--cb-nav-blur-scrolled)] shadow-[0_12px_40px_-16px_rgba(40,28,20,0.14)] backdrop-blur-xl supports-[backdrop-filter]:bg-[color:var(--cb-nav-blur-scrolled)] dark:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.45)]"
            : "border-cb-peach-deep/45 bg-[color:var(--cb-nav-blur)] backdrop-blur-md supports-[backdrop-filter]:bg-[color:var(--cb-nav-blur)] dark:border-cb-border/30",
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
              <SiteLogoLink />
            </div>

            <nav
              className="hidden items-center gap-8 lg:flex"
              aria-label={t("nav.primary")}
            >
              <Link
                href="/shop"
                className={cn(
                  linkBase,
                  shopActive &&
                    "text-cb-text-strong underline decoration-[1.5px] underline-offset-[10px] decoration-cb-terracotta-dark/80 dark:decoration-cb-terracotta/70",
                )}
              >
                {t("nav.shop")}
              </Link>
              <Link
                href="/gift-box"
                className={cn(
                  linkBase,
                  giftsActive &&
                    "text-cb-text-strong underline decoration-[1.5px] underline-offset-[10px] decoration-cb-terracotta-dark/80 dark:decoration-cb-terracotta/70",
                )}
              >
                {t("nav.gifts")}
              </Link>
              <NavDropdown label={t("nav.discover")} items={discoverLinks} />
              <NavDropdown label={t("nav.help")} items={helpLinks} />
            </nav>

            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle className="inline-flex" />
              <LanguageToggle className="hidden md:inline-flex" />
              <Link
                href="/search"
                className={iconBtn}
                aria-label={t("actions.search")}
              >
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
                <div className="flex items-center justify-center h-11 w-11">
                  <UserButton
                    userProfileUrl="/account/settings"
                    userProfileMode="navigation"
                    appearance={{
                      elements: {
                        avatarBox:
                          "h-[2.15rem] w-[2.15rem] ring-2 ring-cb-peach-deep dark:ring-cb-border transition-transform hover:scale-105",
                      },
                    }}
                  >
                    <UserButton.MenuItems>
                      <UserButton.Link
                        label="Dashboard / Account"
                        labelIcon={<UserRound className="h-4 w-4" />}
                        href="/account"
                      />
                      <UserButton.Action label="manageAccount" />
                    </UserButton.MenuItems>
                  </UserButton>
                </div>
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
            aria-label={t("nav.siteNavigation")}
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
                  <ThemeToggle />
                  <LanguageToggle mobile />
                </div>
              </div>
              <ul className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-4">
                {mobileFullLinks.map((item, i) => (
                  <motion.li
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
                  </motion.li>
                ))}
              </ul>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
