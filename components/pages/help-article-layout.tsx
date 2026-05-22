import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";
import type { HelpArticleContent } from "@/lib/content/help-articles";

type Props = {
  article: HelpArticleContent;
};

export function HelpArticleLayout({ article }: Props) {
  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <nav className="mb-6 text-sm text-cb-text-muted">
          <Link href="/" className="hover:text-cb-terracotta-dark">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/help" className="hover:text-cb-terracotta-dark">
            Help center
          </Link>
          <span className="mx-2">/</span>
          <span className="text-cb-text">{article.title}</span>
        </nav>

        <SectionHeading align="left" className="text-left" title={article.title} />

        {article.sections.map((section) => (
          <section key={section.heading} className="mt-10">
            <h2 className="font-serif text-xl font-semibold text-cb-text-strong">{section.heading}</h2>
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="mt-3 text-sm leading-relaxed text-cb-text">
                {p}
              </p>
            ))}
          </section>
        ))}

        {article.relatedLinks.length ? (
          <div className="mt-12 rounded-2xl border border-cb-border bg-cb-surface p-6">
            <h3 className="font-serif text-lg font-semibold text-cb-text-strong">Related</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {article.relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-semibold text-cb-terracotta-dark hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Link href="/shop" className={buttonClassName("primary", "mt-10 inline-flex rounded-full px-8")}>
          Shop cookies
        </Link>
      </div>
    </div>
  );
}
