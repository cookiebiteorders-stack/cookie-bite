import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";

type FaqItem = { q: string; a: string };

type Props = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  sections: Array<{ heading: string; body: string }>;
  faqs?: FaqItem[];
  ctaHref?: string;
  ctaLabel?: string;
};

export function SeoLandingPage({
  eyebrow,
  title,
  subtitle,
  sections,
  faqs,
  ctaHref = "/shop",
  ctaLabel = "Shop cookies",
}: Props) {
  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <SectionHeading align="left" className="text-left" eyebrow={eyebrow} title={title} subtitle={subtitle} />

        {sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="font-serif text-xl font-semibold text-cb-text-strong">{s.heading}</h2>
            <p className="mt-3 text-sm leading-relaxed text-cb-text">{s.body}</p>
          </section>
        ))}

        {faqs?.length ? (
          <section className="mt-12">
            <h2 className="font-serif text-xl font-semibold text-cb-text-strong">Frequently asked questions</h2>
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
