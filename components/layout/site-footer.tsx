"use client";

import Link from "next/link";
import { Facebook, Heart, Instagram, Mail, MessageCircle } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { FooterToolbar } from "@/components/ui/footer-toolbar";
import { useLanguage } from "@/components/providers/language-provider";
import { useBusinessHours } from "@/components/providers/store-business-settings-provider";
import { BRAND, brandLocation } from "@/lib/brand";
import { NAV_LINKS, SITE } from "@/lib/data";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const socialUnderline =
  "cb-touch-manipulation flex h-11 w-11 items-center justify-center rounded-lg border border-cb-peach-deep/80 bg-cb-cream/80 text-cb-terracotta-dark transition-all duration-200 hover:-translate-y-px hover:border-cb-terracotta-dark/50 hover:bg-cb-cream hover:shadow-sm dark:border-cb-border dark:bg-cb-surface-2/80 dark:text-cb-terracotta";

export function SiteFooter() {
  const wa = siteConfig.whatsappNumber || BRAND.whatsappE164;
  const { t, lang } = useLanguage();
  const businessHours = useBusinessHours();
  const linkSections = [
    {
      id: "shop",
      title: t("footer.shop"),
      items: NAV_LINKS.filter((l) =>
        ["/", "/shop", "/our-cookies", "/gift-box"].includes(l.href),
      ).map((link) => ({
        ...link,
        label:
          link.label === "Home"
            ? t("tabs.home")
            : link.label === "Shop"
              ? t("tabs.shop")
              : link.label === "Gifts"
                ? t("tabs.gifts")
                : link.label === "Our Cookies"
                  ? t("nav.ourCookies")
                  : link.label,
      })),
    },
    {
      id: "company",
      title: t("footer.company"),
      items: NAV_LINKS.filter((l) => ["/our-story", "/contact"].includes(l.href)).map(
        (link) => ({
          ...link,
          label: link.label === "Our Story" ? t("footer.ourStory") : t("nav.contact"),
        }),
      ),
    },
    {
      id: "support",
      title: t("footer.customerCare"),
      items: [
        { href: "/help", label: t("nav.helpCenter") },
        { href: "/help/faq", label: t("nav.faq") },
        { href: "/delivery/new-cairo", label: t("footer.deliveryNewCairo") },
        { href: "/corporate-gifting", label: t("footer.corporateGifting") },
        { href: "/shipping", label: t("footer.contactShipping") },
        { href: "/help/returns", label: t("footer.returnsRefunds") },
        { href: "/privacy", label: t("footer.privacyPolicy") },
        { href: "/terms", label: t("footer.termsConditions") },
      ],
    },
    {
      id: "account",
      title: t("footer.account"),
      items: [
        { href: "/account", label: t("footer.dashboard") },
        { href: "/sign-in", label: t("actions.signIn") },
        { href: "/sign-up", label: t("footer.createAccount") },
      ],
    },
    {
      id: "visit",
      title: t("footer.visit"),
      items: [
        { href: "/shop", label: t("footer.newArrivals") },
        { href: "/gift-box", label: t("footer.giftBoxes") },
        { href: "/our-cookies", label: t("footer.allFlavors") },
      ],
    },
    {
      id: "hours",
      title: t("footer.hours"),
      items: [
        { href: "/contact", label: businessHours },
        {
          href: `mailto:${BRAND.ordersEmail}`,
          label: BRAND.ordersEmail,
        },
        {
          href: `tel:+${siteConfig.whatsappNumber || BRAND.whatsappE164}`,
          label: `+${siteConfig.whatsappNumber || BRAND.whatsappE164}`,
        },
      ],
    },
  ];

  return (
    <footer className="cb-pl-footer mt-auto w-full">
      <div className="relative mx-auto grid max-w-7xl items-start justify-center gap-8 cb-gutter py-10 pb-0 md:flex md:gap-10 lg:gap-10 lg:py-12">
        <Link
          href="/"
          className="flex shrink-0 justify-center md:justify-start"
          aria-label={`${SITE.name} ${t("tabs.home")}`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cb-peach-deep bg-cb-cream shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md dark:border-cb-border dark:bg-cb-surface-elevated">
            <LogoMark className="h-10 w-10 text-cb-brand-logo" title={SITE.name} />
          </span>
        </Link>
        <p className="max-w-2xl bg-transparent text-center text-xs leading-relaxed text-cb-text md:text-start md:text-sm">
          {t("footer.blurb")}
        </p>
      </div>

      <div className="mx-auto max-w-7xl cb-gutter py-10">
        <div className="border-b border-cb-peach-deep/80" />
        <div className="py-8 md:py-10">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 leading-6 sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-between lg:gap-x-8 lg:gap-y-6">
            {linkSections.map((section) => (
              <div key={section.id} className="min-w-[8rem]">
                <p
                  id={`footer-${section.id}-heading`}
                  className="mb-3 text-xs font-bold uppercase tracking-wider text-cb-text-strong"
                >
                  {section.title}
                </p>
                <ul className="flex flex-col space-y-2" role="list">
                  {section.items.map((item) => (
                    <li key={`${section.id}-${item.label}`} className="flow-root">
                      <Link
                        href={item.href}
                        className="text-sm font-medium text-cb-text transition-colors duration-200 hover:text-cb-terracotta-dark md:text-xs"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="border-b border-cb-peach-deep/80" />
      </div>

      <div className="flex flex-wrap justify-center gap-y-8 cb-gutter pb-6 pt-2">
        <div className="flex flex-wrap items-center justify-center gap-4 gap-y-4">
          <a
            href={`mailto:${BRAND.email}`}
            className={cn(socialUnderline)}
            aria-label={t("footer.email")}
          >
            <Mail className="h-5 w-5" strokeWidth={1.5} />
          </a>
          <a
            href={BRAND.social.instagram}
            target="_blank"
            rel="noreferrer"
            className={socialUnderline}
            aria-label={t("footer.instagram")}
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href={BRAND.social.facebook}
            target="_blank"
            rel="noreferrer"
            className={socialUnderline}
            aria-label={t("footer.facebook")}
          >
            <Facebook className="h-5 w-5" />
          </a>
          <a
            href={BRAND.social.tiktok}
            target="_blank"
            rel="noreferrer"
            className={socialUnderline}
            aria-label={t("footer.tiktok")}
          >
            <span className="text-xs font-bold">TT</span>
          </a>
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer"
            className={socialUnderline}
            aria-label={t("footer.whatsapp")}
          >
            <MessageCircle className="h-5 w-5" />
          </a>
        </div>
        <FooterToolbar />
      </div>

      <div className="mx-auto mb-10 mt-6 flex max-w-7xl flex-col justify-between cb-gutter text-center text-xs text-cb-text">
        <div className="flex flex-row flex-wrap items-center justify-center gap-1">
          <span>©</span>
          <span>{new Date().getFullYear()}</span>
          <span>{SITE.name}.</span>
          <span>{t("footer.madeWith")}</span>
          <Heart
            className="mx-1 h-4 w-4 animate-pulse text-cb-terracotta-dark"
            aria-hidden
          />
          <span>{t("footer.inLocation", { location: brandLocation(lang) })}</span>
          <Link
            href="/our-story"
            className="ms-1 font-bold text-cb-text-strong hover:text-cb-terracotta-dark"
          >
            {t("footer.ourStory")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
