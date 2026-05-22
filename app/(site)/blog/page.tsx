import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { ShareButtons } from "@/components/seo/share-buttons";
import { getSanityClient } from "@/lib/sanity/client";
import { BLOG_POSTS_INDEX_QUERY } from "@/lib/sanity/queries";
import { buildFaqPageJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Cookie Blog: New Cairo Dessert Tips & Gift Ideas",
  description:
    "Read Cookie Bite blog guides on cookie gifting, dessert trends, and celebration ideas in New Cairo. Find practical tips and inspiration.",
  path: "/blog",
  keywords: [
    "cookie blog cairo",
    "dessert tips egypt",
    "gift box ideas cairo",
    "cookie delivery guide",
    "new cairo bakery blog",
  ],
});

type BlogIndexRow = {
  slug: string;
  title_en: string;
  title_ar: string;
  excerpt_en?: string | null;
  _updatedAt?: string;
};

export default async function BlogIndexPage() {
  const faqJsonLd = buildFaqPageJsonLd([
    {
      q: "What does Cookie Bite blog cover?",
      a: "We share cookie gifting ideas, seasonal flavor guides, dessert planning tips, and updates from our New Cairo kitchen.",
    },
    {
      q: "How often are new posts published?",
      a: "We publish updates regularly and refresh our most useful guides throughout the season.",
    },
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
      <div className="mx-auto max-w-3xl px-4 text-center lg:px-6">
        <JsonLdScript id="blog-faq-jsonld" json={faqJsonLd} />
        <SectionHeading
          title="From the kitchen journal"
          subtitle={
            posts.length
              ? "مقالات بالإنجليزية والعربية — محدّثة من Sanity."
              : "Seasonal drops, behind-the-scenes bakes, and gifting inspiration — posts appear here when Sanity is configured."
          }
        />
        {!client ? (
          <p className="mt-8 text-cb-text">
            ربط Sanity غير مفعّل (<code className="rounded bg-cb-surface-2 px-1">NEXT_PUBLIC_SANITY_PROJECT_ID</code>
            ).
          </p>
        ) : null}

        {posts.length ? (
          <ul className="mt-10 space-y-4 text-start">
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
                      Updated {p._updatedAt.slice(0, 10)}
                    </time>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : client ? (
          <p className="mt-8 text-cb-text">لا توجد مقالات منشورة بعد في Sanity.</p>
        ) : null}

        <div className="mt-6">
          <ShareButtons title="Cookie Bite Blog: Dessert Tips & Gift Ideas" />
        </div>
        <Link href="/shop" className={buttonClassName("primary", "mt-8 inline-flex rounded-full px-8")}>
          Shop while you wait
        </Link>
      </div>
    </div>
  );
}
