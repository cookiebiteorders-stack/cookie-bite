import Link from "next/link";
import { BLOG_SEED_TITLES } from "@/lib/sanity/queries";

export default function AdminCmsPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-cb-border bg-cb-surface-elevated p-6">
      <h1 className="font-serif text-2xl font-bold text-cb-text-strong">CMS &amp; Sanity</h1>
      <p className="text-sm text-cb-text-muted">
        المحتوى التحريري يُدار عبر Sanity Studio — الصفحة العامة للمدونة:{" "}
        <Link href="/blog" className="font-semibold text-cb-terracotta-dark underline">
          /blog
        </Link>
        .
      </p>
      <div className="rounded-xl border border-cb-border bg-cb-cream/50 p-4">
        <h2 className="text-sm font-bold text-cb-text-strong">مقالات مقترحة للـ SEO (8)</h2>
        <p className="mt-1 text-xs text-cb-text-muted">
          أنشئ مستندات <code className="rounded bg-cb-surface-2 px-1">blogPost</code> بنفس الـ slug في Sanity.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-cb-text">
          {BLOG_SEED_TITLES.map((post) => (
            <li key={post.slug}>
              <span className="font-medium">{post.title_en}</span>
              <span className="text-cb-text-muted"> → /blog/{post.slug}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-cb-text-muted">
        حقول SEO في المخطط: <code>seo_title</code>, <code>seo_description</code>,{" "}
        <code>focus_keyword</code>, <code>date_published</code>, <code>author_name</code>.
      </p>
    </section>
  );
}
