"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Menu, Search, ShoppingBag, Settings, SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { LogoMark } from "@/components/brand/logo-mark";
import { useCart } from "@/components/providers/cart-provider";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { useLanguage } from "@/components/providers/language-provider";
import { useOptionalAdminConsole } from "@/components/admin/admin-console-context";
import { resolveCurrentAdminConsolePage } from "@/lib/admin/admin-console-nav";
import { getRoleLabel } from "@/lib/admin/rbac";

type HeaderVariant = "home" | "shop" | "story" | "account" | "admin" | "default";

function getVariant(pathname: string): HeaderVariant {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/shop") || pathname.startsWith("/our-cookies") || pathname.startsWith("/gift-ideas")) return "shop";
  if (pathname.startsWith("/our-story")) return "story";
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/admin")) return "admin";
  return "default";
}

function getTitle(pathname: string): string {
  if (pathname === "/") return "";
  if (pathname.startsWith("/shop")) return "Shop";
  if (pathname.startsWith("/our-cookies")) return "Our Cookies";
  if (pathname.startsWith("/gift-ideas")) return "Gift Ideas";
  if (pathname.startsWith("/our-story")) return "Our Story";
  if (pathname.startsWith("/account")) return "My Account";
  if (pathname.startsWith("/gift-box")) return "Gift Box";
  if (pathname.startsWith("/cart")) return "My Cart";
  if (pathname.startsWith("/contact")) return "Contact";
  if (pathname.startsWith("/admin")) return "Admin Console";
  return "";
}

const isRootTab = (path: string) =>
  path === "/" ||
  path === "/shop" ||
  path === "/gift-ideas" ||
  path === "/account";

export function MobileHeader() {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useCart();
  const { t, lang } = useLanguage();
  const admin = useOptionalAdminConsole();
  const currentAdminPage = admin
    ? resolveCurrentAdminConsolePage(pathname, admin.navItems)
    : undefined;
  const variant = getVariant(pathname);
  const title = getTitle(pathname);
  const showBack = !isRootTab(pathname) && !admin;

  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 80);
  });

  const isTransparent =
    (variant === "home" || variant === "story") && !scrolled;
  const localizedTitle =
    title === "Shop"
      ? t("mobileHeader.shop")
      : title === "Our Cookies"
        ? t("mobileHeader.ourCookies")
        : title === "Gift Ideas"
          ? t("mobileHeader.giftIdeas")
          : title === "Our Story"
            ? t("mobileHeader.ourStory")
            : title === "My Account"
              ? t("mobileHeader.myAccount")
              : title === "Gift Box"
                ? t("mobileHeader.giftBox")
                : title === "My Cart"
                  ? t("mobileHeader.myCart")
                  : title === "Contact"
                    ? t("mobileHeader.contact")
                    : title === "Admin Console"
                      ? t("mobileHeader.adminConsole")
                      : title;
  const adminPageTitle = currentAdminPage?.label ?? "";
  const localizedTitleEffective =
    admin && adminPageTitle ? adminPageTitle : localizedTitle;
  const consoleLabel = lang === "ar" ? "لوحة الإدارة" : "Admin console";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileLinks = useMemo(
    () => [
      { href: "/shop", label: t("nav.shop") },
      { href: "/gift-box", label: t("nav.gifts") },
      { href: "/our-story", label: t("nav.ourStory") },
      { href: "/our-cookies", label: t("nav.ourCookies") },
      { href: "/blog", label: t("nav.blog") },
      { href: "/help", label: t("nav.helpCenter") },
      { href: "/help/faq", label: t("nav.faq") },
      { href: "/contact", label: t("nav.contact") },
      { href: "/account", label: t("nav.account") },
    ],
    [t],
  );

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileMenuOpen]);

  return (
    <>
    <header
      className={cn(
        "mobile-header",
        isTransparent
          ? "mobile-header--transparent"
          : "mobile-header--solid",
        scrolled && "mobile-header--scrolled",
      )}
    >
      {/* LEFT ZONE */}
      <div className="mobile-header__left">
        {admin ? (
          <button
            type="button"
            className="mobile-header__icon-btn"
            aria-controls="admin-mobile-nav"
            aria-expanded={admin.adminNavOpen}
            onClick={() => admin.setAdminNavOpen(true)}
            aria-label={lang === "ar" ? "قائمة لوحة الإدارة" : "Admin console menu"}
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        ) : showBack ? (
          <Link
            href="/"
            className="mobile-header__icon-btn"
            aria-label={t("mobileHeader.goBack")}
          >
            {lang === "ar" ? (
              <ArrowRight className="h-6 w-6" aria-hidden />
            ) : (
              <ArrowLeft className="h-6 w-6" aria-hidden />
            )}
          </Link>
        ) : (
          <button
            type="button"
            className="mobile-header__icon-btn"
            aria-haspopup="dialog"
            aria-controls="site-mobile-nav"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        )}
      </div>

      {/* CENTER ZONE */}
      <div className="mobile-header__center">
        {variant === "home" ? (
          <Link
            href="/"
            className="mobile-header__logo inline-flex justify-center"
            aria-label={t("mobileHeader.home")}
          >
            <LogoMark className="h-8 w-8 text-cb-brand-logo" title="Cookie Bite" />
          </Link>
        ) : admin ? (
          <div className="flex min-w-0 flex-col items-center gap-0.5 px-1">
            <h1 className="mobile-header__title">{localizedTitleEffective}</h1>
            <p className="max-w-full truncate text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-cb-terracotta-dark dark:text-cb-terracotta">
              {consoleLabel} · {getRoleLabel(admin.role)}
            </p>
          </div>
        ) : (
          <h1 className="mobile-header__title">{localizedTitleEffective}</h1>
        )}
      </div>

      {/* RIGHT ZONE */}
      <div className="mobile-header__right">
        {variant === "account" ? (
          <Link
            href="/account/settings"
            className="mobile-header__icon-btn"
            aria-label={t("mobileHeader.settings")}
          >
            <Settings className="h-6 w-6" aria-hidden />
          </Link>
        ) : (
          <>
            {(variant === "shop") && (
              <button
                type="button"
                className="mobile-header__icon-btn"
                aria-label={t("mobileHeader.filter")}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("cookiebite:openShopFilters"));
                }}
              >
                <SlidersHorizontal className="h-5 w-5" aria-hidden />
              </button>
            )}
            <LanguageToggle mobile className="mobile-header__icon-btn !p-0" />
            <Link
              href="/search"
              className="mobile-header__icon-btn"
              aria-label={t("mobileHeader.search")}
            >
              <Search className="h-6 w-6" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={openDrawer}
              className="mobile-header__icon-btn mobile-header__cart-btn"
              aria-label={
                itemCount
                  ? t("mobileHeader.cartWithCount", { count: itemCount })
                  : t("mobileHeader.cart")
              }
            >
              <ShoppingBag className="h-6 w-6" aria-hidden />
              {itemCount > 0 && (
                <span className="mobile-header__cart-badge">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>
          </>
        )}
      </div>
    </header>
    <AnimatePresence>
      {mobileMenuOpen ? (
        <motion.div
          id="site-mobile-nav"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] md:hidden"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label={t("nav.closeMenu")}
            onClick={() => setMobileMenuOpen(false)}
          />
          <motion.nav
            initial={{ x: lang === "ar" ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: lang === "ar" ? "100%" : "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute inset-y-0 start-0 flex w-[min(88vw,340px)] flex-col border-e border-cb-border bg-cb-surface p-4 pt-6"
          >
            <div className="mb-3 flex items-center justify-between border-b border-cb-border pb-3">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-cb-text-muted">{t("nav.menu")}</span>
              <button
                type="button"
                className="mobile-header__icon-btn"
                aria-label={t("nav.closeMenu")}
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
              {mobileLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-3 text-sm font-semibold text-cb-text-strong hover:bg-cb-peach/45"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
    </>
  );
}
