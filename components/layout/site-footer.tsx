import Link from "next/link";
import { Facebook, Heart, Instagram, Mail, MessageCircle } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { FooterToolbar } from "@/components/ui/footer-toolbar";
import { BRAND } from "@/lib/brand";
import { NAV_LINKS, SITE } from "@/lib/data";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const FOOTER_BLURB =
  "Cookie Bite bakes small-batch cookies in Fifth Settlement, New Cairo — real butter, quality chocolate, and packaging made for gifting. Every box is assembled by hand so your moments taste as good as they feel.";

const linkSections = [
  {
    id: "shop",
    title: "Shop",
    items: NAV_LINKS.filter((l) =>
      ["/", "/shop", "/our-cookies", "/gift-box"].includes(l.href),
    ),
  },
  {
    id: "company",
    title: "Company",
    items: NAV_LINKS.filter((l) => ["/our-story", "/contact"].includes(l.href)),
  },
  {
    id: "support",
    title: "Customer care",
    items: [
      { href: "/help/faq", label: "FAQ" },
      { href: "/contact", label: "Contact & shipping" },
      { href: "/help/returns", label: "Returns & refunds" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms & conditions" },
    ],
  },
  {
    id: "account",
    title: "Account",
    items: [
      { href: "/account", label: "Dashboard" },
      { href: "/sign-in", label: "Sign in" },
      { href: "/sign-up", label: "Create account" },
    ],
  },
  {
    id: "visit",
    title: "Visit",
    items: [
      { href: "/shop", label: "New arrivals" },
      { href: "/gift-box", label: "Gift boxes" },
      { href: "/our-cookies", label: "All flavors" },
    ],
  },
  {
    id: "hours",
    title: "Hours",
    items: [
      { href: "/contact", label: "Sun–Thu · 10am – 8pm" },
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

const socialUnderline =
  "cb-touch-manipulation flex h-11 w-11 items-center justify-center rounded-lg border border-cb-peach-deep/80 bg-cb-cream/80 text-cb-terracotta-dark transition-all duration-200 hover:-translate-y-px hover:border-cb-terracotta-dark/50 hover:bg-cb-cream hover:shadow-sm dark:border-cb-border dark:bg-cb-surface-2/80 dark:text-cb-terracotta";

export function SiteFooter() {
  const wa = siteConfig.whatsappNumber || BRAND.whatsappE164;

  return (
    <footer className="mt-auto w-full border-t border-cb-peach-deep bg-cb-peach/50 dark:border-cb-border/50 dark:bg-cb-surface-2/80">
      <div className="relative mx-auto grid max-w-7xl items-start justify-center gap-8 cb-gutter py-10 pb-0 md:flex md:gap-10 lg:gap-10 lg:py-12">
        <Link
          href="/"
          className="flex shrink-0 justify-center md:justify-start"
          aria-label={`${SITE.name} home`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cb-peach-deep bg-cb-cream shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md dark:border-cb-border dark:bg-cb-surface-elevated">
            <LogoMark className="h-10 w-10 text-cb-brand-logo" title={SITE.name} />
          </span>
        </Link>
        <p className="max-w-2xl bg-transparent text-center text-xs leading-relaxed text-cb-text md:text-left md:text-sm">
          {FOOTER_BLURB}
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
            aria-label="Email"
          >
            <Mail className="h-5 w-5" strokeWidth={1.5} />
          </a>
          <a
            href={BRAND.social.instagram}
            target="_blank"
            rel="noreferrer"
            className={socialUnderline}
            aria-label="Instagram"
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href={BRAND.social.facebook}
            target="_blank"
            rel="noreferrer"
            className={socialUnderline}
            aria-label="Facebook"
          >
            <Facebook className="h-5 w-5" />
          </a>
          <a
            href={BRAND.social.tiktok}
            target="_blank"
            rel="noreferrer"
            className={socialUnderline}
            aria-label="TikTok"
          >
            <span className="text-xs font-bold">TT</span>
          </a>
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer"
            className={socialUnderline}
            aria-label="WhatsApp"
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
          <span>Made with</span>
          <Heart
            className="mx-1 h-4 w-4 animate-pulse text-cb-terracotta-dark"
            aria-hidden
          />
          <span>in {BRAND.location}.</span>
          <Link
            href="/our-story"
            className="ms-1 font-bold text-cb-text-strong hover:text-cb-terracotta-dark"
          >
            Our story
          </Link>
        </div>
      </div>
    </footer>
  );
}
