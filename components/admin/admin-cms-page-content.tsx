"use client";

import Link from "next/link";
import { BLOG_SEED_TITLES } from "@/lib/sanity/queries";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { useLanguage } from "@/components/providers/language-provider";

export function AdminCmsPageContent() {
  const { lang } = useLanguage();

  return (
    <section className="space-y-4">
      <AdminPageIntro titleKey="adminPages.cms.title" subtitleKey="adminPages.cms.subtitle" />
      <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-6">
        <p className="text-sm text-cb-text-muted">
          {lang === "ar"
            ? "المحتوى التحريري يُدار عبر Sanity Studio — الصفحة العامة للمدونة: "
            : "Editorial content is managed in Sanity Studio — public blog: "}
          <Link href="/blog" className="font-semibold text-cb-terracotta-dark underline">
            /blog
          </Link>
          .
        </p>
        <div className="mt-4 rounded-xl border border-cb-border bg-cb-cream/50 p-4">
          <h2 className="text-sm font-bold text-cb-text-strong">
            {lang === "ar" ? "مقالات مقترحة للـ SEO (8)" : "Suggested SEO articles (8)"}
          </h2>
          <p className="mt-1 text-xs text-cb-text-muted">
            {lang === "ar"
              ? "أنشئ مستندات blogPost بنفس الـ slug في Sanity."
              : "Create blogPost documents with matching slugs in Sanity."}
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
        <p className="mt-4 text-xs text-cb-text-muted">
          SEO fields: <code>seo_title</code>, <code>seo_description</code>, <code>focus_keyword</code>,{" "}
          <code>date_published</code>, <code>author_name</code>.
        </p>
      </div>
    </section>
  );
}
