"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, FileText } from "lucide-react";
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
import { CmsArticlesPanel } from "@/components/admin/cms/cms-articles-panel";

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
    <section className="w-full min-w-0 max-w-full space-y-4 overflow-x-clip">
      <AdminPageIntro titleKey="adminPages.cms.title" subtitleKey="adminPages.cms.subtitle" />

      <div className="min-w-0 w-full max-w-full rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm sm:p-6">
        <p className="text-sm text-cb-text-muted">
          {adminT("cms.studioNote")}{" "}
          <Link href="/blog" className="font-semibold text-cb-terracotta-dark underline">
            /blog
          </Link>
        </p>

        <div className="mt-6 min-w-0 w-full max-w-full overflow-x-clip rounded-2xl border border-cb-border bg-cb-cream/40 p-4 sm:p-5">
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

          <CmsArticlesPanel
            articles={articles}
            sortBy={sortBy}
            categoryStyles={CATEGORY_STYLES}
            copiedSlug={copiedSlug}
            onCopySlug={(slug) => void copySlug(slug)}
          />
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
