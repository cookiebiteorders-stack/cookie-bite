import Link from "next/link";
import { SeoRelatedLinks, type SeoRelatedLink } from "@/components/seo/seo-related-links";
import { buttonClassName } from "@/components/ui/button";

type FaqItem = { q: string; a: string };

type Props = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  sections: Array<{ heading: string; body: string }>;
  faqs?: FaqItem[];
  faqHeading?: string;
  relatedLinks?: SeoRelatedLink[];
  relatedLinksAria?: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export function SeoLandingPage({
  eyebrow,
  title,
  subtitle,
  sections,
  faqs,
  faqHeading = "Frequently asked questions",
  relatedLinks,
  relatedLinksAria = "Related pages",
  ctaHref = "/shop",
  ctaLabel = "Shop cookies",
}: Props) {
  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <header className="mx-auto mb-8 max-w-3xl space-y-4 md:mb-12">
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cb-terracotta-dark">{eyebrow}</p>
          ) : null}
          <h1 className="font-serif text-[clamp(1.75rem,2.2vw+1rem,2.5rem)] font-semibold leading-tight text-cb-text-strong">
            {title}
          </h1>
          <p className="max-w-[min(42rem,100%)] text-cb-text-muted sm:text-lg">{subtitle}</p>
        </header>

        {sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="font-serif text-xl font-semibold text-cb-text-strong">{s.heading}</h2>
            <p className="mt-3 text-sm leading-relaxed text-cb-text">{s.body}</p>
          </section>
        ))}

        {relatedLinks?.length ? (
          <section className="mt-10">
            <SeoRelatedLinks ariaLabel={relatedLinksAria} links={relatedLinks} />
          </section>
        ) : null}

        {faqs?.length ? (
          <section className="mt-12">
            <h2 className="font-serif text-xl font-semibold text-cb-text-strong">{faqHeading}</h2>
            <ul className="mt-6 space-y-4">
              {faqs.map((item) => (
                <li key={item.q} className="rounded-2xl border border-cb-border bg-cb-surface p-5">
                  <h3 className="font-semibold text-cb-text-strong">{item.q}</h3>
                  <p className="mt-2 text-sm text-cb-text">{item.a}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Link href={ctaHref} className={buttonClassName("primary", "mt-10 inline-flex rounded-full px-8")}>
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
