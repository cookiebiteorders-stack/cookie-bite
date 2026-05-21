"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Menu, Search, ShoppingBag, Settings, SlidersHorizontal } from "lucide-react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
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

  return (
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
        ) : variant === "home" ? (
          <Link href="/" className="mobile-header__logo" aria-label={t("mobileHeader.home")}>
            <LogoMark className="h-8 w-8 text-cb-brand-logo" title="Cookie Bite" />
          </Link>
        ) : null}
      </div>

      {/* CENTER ZONE */}
      <div className="mobile-header__center">
        {variant === "home" ? (
          <span
            className={cn(
              "mobile-header__wordmark",
              !scrolled && "opacity-0",
            )}
          >
            Cookie Bite
          </span>
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
  );
}
