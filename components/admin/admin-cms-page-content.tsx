"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Copy, ExternalLink, FileText, Check } from "lucide-react";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { useAdminT } from "@/lib/admin/use-admin-t";
import {
  BLOG_SEED_CATALOG,
  filterBlogSeedByCategory,
  sortBlogSeedCatalog,
  type BlogSeedCategory,
  type BlogSeedSortKey,
} from "@/lib/cms/blog-seed-catalog";
import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<BlogSeedCategory, string> = {
  gifting: "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100",
  local_seo: "bg-sky-100 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100",
  seasonal: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100",
  operations: "bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-100",
  brand: "bg-violet-100 text-violet-950 dark:bg-violet-950/50 dark:text-violet-100",
};

const SEO_FIELD_KEYS = [
  "seo_title",
  "seo_description",
  "focus_keyword",
  "date_published",
  "author_name",
] as const;

const CATEGORY_KEYS: BlogSeedCategory[] = [
  "local_seo",
  "gifting",
  "seasonal",
  "operations",
  "brand",
];

export function AdminCmsPageContent() {
  const { adminT } = useAdminT();
  const [sortBy, setSortBy] = useState<BlogSeedSortKey>("priority");
  const [categoryFilter, setCategoryFilter] = useState<BlogSeedCategory | "all">("all");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const articles = useMemo(() => {
    const filtered = filterBlogSeedByCategory(BLOG_SEED_CATALOG, categoryFilter);
    return sortBlogSeedCatalog(filtered, sortBy);
  }, [sortBy, categoryFilter]);

  async function copySlug(slug: string) {
    try {
      await navigator.clipboard.writeText(slug);
      setCopiedSlug(slug);
      window.setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="space-y-4">
      <AdminPageIntro titleKey="adminPages.cms.title" subtitleKey="adminPages.cms.subtitle" />

      <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-6 shadow-sm">
        <p className="text-sm text-cb-text-muted">
          {adminT("cms.studioNote")}{" "}
          <Link href="/blog" className="font-semibold text-cb-terracotta-dark underline">
            /blog
          </Link>
        </p>

        <div className="mt-6 rounded-2xl border border-cb-border bg-cb-cream/40 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-cb-text-strong">
                <FileText className="h-5 w-5 text-amber-700" />
                {adminT("cms.calendarTitle")}
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-cb-text-muted">{adminT("cms.calendarSub")}</p>
              <p className="mt-2 text-xs font-bold text-stone-600">
                {adminT("cms.articleCount", { n: BLOG_SEED_CATALOG.length })}
              </p>
            </div>

            <label className="flex shrink-0 items-center gap-2 text-sm">
              <ArrowUpDown className="h-4 w-4 text-stone-500" aria-hidden />
              <span className="font-semibold text-cb-text-strong">{adminT("cms.sortLabel")}</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as BlogSeedSortKey)}
                className="rounded-xl border border-cb-border bg-white px-3 py-2 text-sm outline-none focus:border-cb-border-strong"
              >
                <option value="priority">{adminT("cms.sort.priority")}</option>
                <option value="category">{adminT("cms.sort.category")}</option>
                <option value="title_en">{adminT("cms.sort.title_en")}</option>
                <option value="slug">{adminT("cms.sort.slug")}</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-bold transition",
                categoryFilter === "all"
                  ? "border-cb-terracotta-dark bg-cb-terracotta-dark text-cb-cream-2"
                  : "border-cb-border bg-white text-stone-700 hover:border-amber-300",
              )}
            >
              {adminT("cms.filterAll")}
            </button>
            {CATEGORY_KEYS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-bold transition",
                  categoryFilter === cat
                    ? "border-cb-terracotta-dark bg-cb-terracotta-dark text-cb-cream-2"
                    : "border-cb-border bg-white text-stone-700 hover:border-amber-300",
                )}
              >
                {adminT(`cms.categories.${cat}`)}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-cb-border bg-white/95">
            <div className="overflow-x-auto">
              <table className="min-w-[880px] w-full divide-y divide-cb-border text-sm">
                <thead className="bg-cb-surface-2/90">
                  <tr className="text-start text-xs font-semibold uppercase tracking-wide text-stone-600">
                    <th className="w-12 px-3 py-3">{adminT("cms.cols.order")}</th>
                    <th className="px-3 py-3">{adminT("cms.cols.category")}</th>
                    <th className="min-w-[240px] px-3 py-3">{adminT("cms.cols.title")}</th>
                    <th className="px-3 py-3">{adminT("cms.cols.slug")}</th>
                    <th className="min-w-[160px] px-3 py-3">{adminT("cms.cols.keyword")}</th>
                    <th className="w-36 px-3 py-3">{adminT("cms.cols.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cb-border">
                  {articles.map((post, index) => (
                    <tr
                      key={post.slug}
                      className={cn(
                        "transition hover:bg-cb-hover-overlay/50",
                        index % 2 === 1 && "bg-cb-surface/25",
                      )}
                    >
                      <td className="px-3 py-3 font-mono text-xs font-bold text-stone-500">
                        {sortBy === "priority" ? post.priority : index + 1}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-[11px] font-bold",
                            CATEGORY_STYLES[post.category],
                          )}
                        >
                          {adminT(`cms.categories.${post.category}`)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-cb-text-strong">{post.title_en}</p>
                        <p className="mt-0.5 text-xs text-cb-text-muted" dir="rtl">
                          {post.title_ar}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                          {post.slug}
                        </code>
                        <p className="mt-1 text-[10px] text-cb-text-muted">/blog/{post.slug}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-cb-text">{post.focus_keyword}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => void copySlug(post.slug)}
                            className="inline-flex items-center gap-1 rounded-lg border border-cb-border px-2 py-1 text-[11px] font-bold hover:bg-cb-surface"
                          >
                            {copiedSlug === post.slug ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            {copiedSlug === post.slug ? adminT("cms.copied") : adminT("cms.copySlug")}
                          </button>
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-cb-border px-2 py-1 text-[11px] font-bold hover:bg-cb-surface"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {adminT("cms.openBlog")}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-cb-border bg-white/60 p-4">
          <p className="text-xs font-bold text-cb-text-strong">{adminT("cms.seoFieldsTitle")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {SEO_FIELD_KEYS.map((field) => (
              <li key={field}>
                <code className="rounded-lg border border-cb-border bg-cb-cream/80 px-2 py-1 text-[11px]">
                  {field}
                </code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
