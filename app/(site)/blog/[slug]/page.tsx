import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { getSanityClient } from "@/lib/sanity/client";
import { BLOG_POST_BY_SLUG_QUERY } from "@/lib/sanity/queries";
import { portableBlocksToPlain } from "@/lib/sanity/block-to-plain";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com";

type BlogDoc = {
  title_en: string;
  title_ar: string;
  excerpt_en?: string | null;
  excerpt_ar?: string | null;
  body_en?: unknown;
  body_ar?: unknown;
  coverUrl?: string | null;
  _updatedAt?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const client = getSanityClient();
  if (!client) {
    return { title: "Blog | Cookie Bite" };
  }
  const doc = await client.fetch<BlogDoc | null>(BLOG_POST_BY_SLUG_QUERY, { slug });
  if (!doc) return { title: "Post not found | Cookie Bite" };
  const title = `${doc.title_en} | Cookie Bite`;
  const description = doc.excerpt_en ?? portableBlocksToPlain(doc.body_en).slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      url: `${APP_URL}/blog/${slug}`,
      title,
      description,
      images: doc.coverUrl ? [{ url: doc.coverUrl, width: 1200, height: 630 }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = getSanityClient();
  if (!client) notFound();

  const doc = await client.fetch<BlogDoc | null>(BLOG_POST_BY_SLUG_QUERY, { slug });
  if (!doc) notFound();

  const bodyEn = portableBlocksToPlain(doc.body_en);
  const bodyAr = portableBlocksToPlain(doc.body_ar);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: doc.title_en,
    inLanguage: ["en", "ar"],
    dateModified: doc._updatedAt,
    image: doc.coverUrl ?? `${APP_URL}/images/web-logo.png`,
    publisher: { "@type": "Organization", name: "Cookie Bite", url: APP_URL },
  };

  return (
    <article className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <JsonLdScript id={`blog-post-${slug}-jsonld`} json={JSON.stringify(jsonLd)} />
        <nav className="mb-6 text-sm text-cb-text-muted">
          <Link href="/blog" className="hover:text-cb-terracotta-dark">
            Blog
          </Link>
          <span className="mx-2">/</span>
          <span className="text-cb-text">{slug}</span>
        </nav>
        <SectionHeading title={doc.title_en} subtitle={doc.title_ar} />
        {doc.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Sanity CDN URL dynamic
          <img src={doc.coverUrl} alt="" className="mt-8 w-full rounded-2xl object-cover shadow-lg" />
        ) : null}
        {doc.excerpt_en ? <p className="mt-8 text-lg text-cb-text">{doc.excerpt_en}</p> : null}
        {doc.excerpt_ar ? <p className="mt-4 text-lg text-cb-text-muted">{doc.excerpt_ar}</p> : null}

        {bodyEn ? (
          <div className="prose prose-stone mt-10 max-w-none whitespace-pre-wrap text-cb-text dark:prose-invert">
            {bodyEn}
          </div>
        ) : null}
        {bodyAr ? (
          <div className="prose prose-stone mt-8 max-w-none whitespace-pre-wrap text-cb-text-muted dark:prose-invert">
            {bodyAr}
          </div>
        ) : null}

        <Link href="/shop" className={buttonClassName("primary", "mt-12 inline-flex rounded-full px-8")}>
          تسوّق الآن
        </Link>
      </div>
    </article>
  );
}
