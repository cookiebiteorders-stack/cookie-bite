import Link from "next/link";
import { Clock, Gift, MapPin, MessageCircle, Package, Truck } from "lucide-react";
import { SectionHeading } from "@/components/sections/section-heading";
import { SeoRelatedLinks, type SeoRelatedLink } from "@/components/seo/seo-related-links";
import { buttonClassName } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type FaqItem = { q: string; a: string };

type Highlight = {
  icon: "truck" | "clock" | "gift";
  title: string;
  body: string;
};

type Feature = {
  icon: "package" | "truck";
  title: string;
  body: string;
};

type AreasBanner = {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  highlights: Highlight[];
  features: Feature[];
  areasBanner: AreasBanner;
  whatsappLabel: string;
  whatsappHint: string;
  faqs: FaqItem[];
  faqHeading: string;
  relatedLinks: SeoRelatedLink[];
  relatedLinksAria: string;
  ctaHref: string;
  ctaLabel: string;
};

const highlightIcons = {
  truck: Truck,
  clock: Clock,
  gift: Gift,
} as const;

const featureIcons = {
  package: Package,
  truck: Truck,
} as const;

export function NewCairoDeliveryPage({
  eyebrow,
  title,
  subtitle,
  highlights,
  features,
  areasBanner,
  whatsappLabel,
  whatsappHint,
  faqs,
  faqHeading,
  relatedLinks,
  relatedLinksAria,
  ctaHref,
  ctaLabel,
}: Props) {
  const whatsappHref = `https://wa.me/${BRAND.whatsappE164}`;

  return (
    <div className="bg-cb-cream">
      <div
        className="border-b border-[var(--color-border-soft)] bg-[var(--gradient-hero)] pb-14 pt-12 md:pb-20 md:pt-16"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 10% 0%, rgba(200,247,228,0.45), transparent 55%), radial-gradient(ellipse 80% 60% at 95% 20%, rgba(255,214,232,0.5), transparent 50%), var(--gradient-hero)",
        }}
      >
        <div className="mx-auto max-w-4xl px-4 lg:px-6">
          <SectionHeading
            align="start"
            variant="editorial"
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
          />

          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => {
              const Icon = highlightIcons[item.icon];
              return (
                <li
                  key={item.title}
                  className="rounded-2xl border border-cb-border/80 bg-white/85 p-5 shadow-[var(--shadow-pl-card)] backdrop-blur-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-cb-cream text-cb-terracotta-dark">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="mt-4 font-semibold text-cb-text-strong">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-cb-text-muted">{item.body}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 lg:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          {features.map((feature) => {
            const Icon = featureIcons[feature.icon];
            return (
              <article
                key={feature.title}
                className="rounded-3xl border border-cb-border bg-cb-surface p-6 shadow-[var(--shadow-pl-card)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cb-peach/60 text-cb-terracotta-dark">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
                      {feature.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-cb-text">{feature.body}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <section
          className={cn(
            "mt-8 overflow-hidden rounded-3xl border border-cb-border",
            "bg-gradient-to-br from-cb-mint/25 via-cb-surface to-cb-peach/30 p-6 md:p-8",
          )}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-cb-terracotta-dark shadow-[var(--shadow-pl-card)]">
                <MapPin className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
                  {areasBanner.title}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-cb-text">
                  {areasBanner.body}
                </p>
              </div>
            </div>
            <Link
              href={areasBanner.ctaHref}
              className={buttonClassName("outline", "shrink-0 rounded-full px-6 py-3")}
            >
              {areasBanner.ctaLabel}
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-cb-border bg-cb-surface p-6 md:flex md:items-center md:justify-between md:gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#128C7E]">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-cb-text-strong">{whatsappLabel}</p>
              <p className="mt-1 text-sm text-cb-text-muted">{whatsappHint}</p>
            </div>
          </div>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName("primary", "mt-5 inline-flex rounded-full px-6 py-3 md:mt-0")}
          >
            {BRAND.phoneDisplay}
          </a>
        </section>

        <section className="mt-14">
          <h2 className="font-serif text-xl font-semibold text-cb-text-strong">{faqHeading}</h2>
          <ul className="mt-6 space-y-3">
            {faqs.map((item) => (
              <li
                key={item.q}
                className="rounded-2xl border border-cb-border bg-cb-surface p-5 transition-shadow hover:shadow-[var(--shadow-pl-card)]"
              >
                <h3 className="font-semibold text-cb-text-strong">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cb-text">{item.a}</p>
              </li>
            ))}
          </ul>
        </section>

        {relatedLinks.length ? (
          <section className="mt-10 border-t border-cb-border pt-8">
            <SeoRelatedLinks ariaLabel={relatedLinksAria} links={relatedLinks} />
          </section>
        ) : null}

        <Link href={ctaHref} className={buttonClassName("primary", "mt-10 inline-flex rounded-full px-8")}>
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
