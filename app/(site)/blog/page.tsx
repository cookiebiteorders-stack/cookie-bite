import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { SeoRelatedLinks } from "@/components/seo/seo-related-links";
import { ShareButtons } from "@/components/seo/share-buttons";
import { getBlogPageFaq, getBlogRelatedLinks } from "@/lib/content/blog-seo";
import { getSanityClient } from "@/lib/sanity/client";
import { BLOG_POSTS_INDEX_QUERY } from "@/lib/sanity/queries";
import { translations } from "@/lib/i18n/translations";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLocalizedPageMetadata,
} from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/blog", lang);
}

type BlogIndexRow = {
  slug: string;
  title_en: string;
  title_ar: string;
  excerpt_en?: string | null;
  _updatedAt?: string;
};

export default async function BlogIndexPage() {
  const lang = await getLangFromCookies();
  const dict = translations[lang];
  const pages = dict.pages as {
    blog: {
      title: string;
      subtitle: string;
      subtitleEmpty: string;
      seoSectionTitle: string;
      seoSectionBody: string;
      relatedLinksAria: string;
      shopCta: string;
      sanityMissing: string;
      noPosts: string;
    };
  };
  const blogCopy = pages.blog;

  const faqJsonLd = buildFaqPageJsonLd(getBlogPageFaq(lang));
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: (dict.tabs as { home: string }).home, path: "/" },
    { name: lang === "ar" ? "المدونة" : "Blog", path: "/blog" },
  ]);

  const client = getSanityClient();
  let posts: BlogIndexRow[] = [];
  if (client) {
    try {
      posts = await client.fetch<BlogIndexRow[]>(BLOG_POSTS_INDEX_QUERY);
    } catch {
      posts = [];
    }
  }

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <JsonLdScript id="blog-faq-jsonld" json={faqJsonLd} />
        <JsonLdScript id="blog-breadcrumb-jsonld" json={breadcrumbJsonLd} />

        <header className="mx-auto mb-8 max-w-3xl text-center">
          <h1 className="font-serif text-[clamp(1.75rem,2.2vw+1rem,2.5rem)] font-semibold text-cb-text-strong">
            {blogCopy.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-cb-text-muted sm:text-lg">
            {posts.length ? blogCopy.subtitle : blogCopy.subtitleEmpty}
          </p>
        </header>

        {!client ? (
          <p className="mt-8 text-cb-text">{blogCopy.sanityMissing}</p>
        ) : null}

        {posts.length ? (
          <ul className="mt-10 space-y-4">
            {posts.map((p) => (
              <li
                key={p.slug}
                className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm transition hover:border-cb-terracotta"
              >
                <Link href={`/blog/${p.slug}`} className="block">
                  <span className="font-serif text-lg font-bold text-cb-text-strong">{p.title_en}</span>
                  <span className="mt-1 block text-sm text-cb-text-muted">{p.title_ar}</span>
                  {p.excerpt_en ? <p className="mt-2 text-sm text-cb-text">{p.excerpt_en}</p> : null}
                  {p._updatedAt ? (
                    <time className="mt-2 block text-xs text-cb-text-soft" dateTime={p._updatedAt}>
                      {lang === "ar" ? "تحديث" : "Updated"} {p._updatedAt.slice(0, 10)}
                    </time>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : client ? (
          <p className="mt-8 text-cb-text">{blogCopy.noPosts}</p>
        ) : null}

        <section className="mt-14 border-t border-cb-border pt-10">
          <h2 className="font-serif text-xl font-semibold text-cb-text-strong">{blogCopy.seoSectionTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-cb-text">{blogCopy.seoSectionBody}</p>
          <SeoRelatedLinks
            className="mt-5"
            ariaLabel={blogCopy.relatedLinksAria}
            links={getBlogRelatedLinks(lang)}
          />
        </section>

        <div className="mt-6">
          <ShareButtons title={blogCopy.title} />
        </div>
        <Link href="/shop" className={buttonClassName("primary", "mt-8 inline-flex rounded-full px-8")}>
          {blogCopy.shopCta}
        </Link>
      </div>
    </div>
  );
}
