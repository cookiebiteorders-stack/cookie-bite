"use client";

import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { BlogSeedArticle, BlogSeedSortKey } from "@/lib/cms/blog-seed-catalog";
import { useAdminT } from "@/lib/admin/use-admin-t";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type Props = {
  articles: BlogSeedArticle[];
  sortBy: BlogSeedSortKey;
  categoryStyles: Record<string, string>;
  copiedSlug: string | null;
  onCopySlug: (slug: string) => void;
};

export function CmsArticlesPanel({
  articles,
  sortBy,
  categoryStyles,
  copiedSlug,
  onCopySlug,
}: Props) {
  const { adminT } = useAdminT();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (!isDesktop) {
    return (
      <ul className="mt-4 flex w-full min-w-0 max-w-full flex-col gap-3">
        {articles.map((post, index) => (
          <li
            key={post.slug}
            className="box-border w-full max-w-full rounded-xl border border-cb-border bg-white/95 p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-stone-500">
                #{sortBy === "priority" ? post.priority : index + 1}
              </span>
              <span
                className={cn(
                  "inline-block rounded-full px-2 py-0.5 text-[11px] font-bold",
                  categoryStyles[post.category],
                )}
              >
                {adminT(`cms.categories.${post.category}`)}
              </span>
            </div>
            <div className="mt-3 min-w-0">
              <p className="break-words font-semibold text-cb-text-strong">{post.title_en}</p>
              <p className="mt-1 break-words text-sm text-cb-text-muted" dir="rtl">
                {post.title_ar}
              </p>
            </div>
            <div className="mt-3 min-w-0">
              <code
                className="block break-all rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-800 dark:bg-stone-800 dark:text-stone-200"
                dir="ltr"
              >
                {post.slug}
              </code>
              <p className="mt-1 break-words text-[10px] text-cb-text-muted" dir="ltr">
                /blog/{post.slug}
              </p>
            </div>
            {post.focus_keyword ? (
              <p className="mt-2 break-words text-xs text-cb-text">
                <span className="font-semibold text-stone-600">{adminT("cms.cols.keyword")}: </span>
                {post.focus_keyword}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onCopySlug(post.slug)}
                className="inline-flex items-center gap-1 rounded-lg border border-cb-border px-2 py-1.5 text-[11px] font-bold hover:bg-cb-surface"
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
                className="inline-flex items-center gap-1 rounded-lg border border-cb-border px-2 py-1.5 text-[11px] font-bold hover:bg-cb-surface"
              >
                <ExternalLink className="h-3 w-3" />
                {adminT("cms.openBlog")}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="admin-table-scroll mt-4 w-full min-w-0 max-w-full rounded-xl border border-cb-border bg-white/95">
      <table className="w-full table-fixed divide-y divide-cb-border text-sm">
        <colgroup>
          <col className="w-[3rem]" />
          <col className="w-[7rem]" />
          <col className="w-[28%]" />
          <col className="w-[18%]" />
          <col className="w-[18%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead className="bg-cb-surface-2/90">
          <tr className="text-start text-xs font-semibold uppercase tracking-wide text-stone-600">
            <th className="px-3 py-3">{adminT("cms.cols.order")}</th>
            <th className="px-3 py-3">{adminT("cms.cols.category")}</th>
            <th className="px-3 py-3">{adminT("cms.cols.title")}</th>
            <th className="px-3 py-3">{adminT("cms.cols.slug")}</th>
            <th className="px-3 py-3">{adminT("cms.cols.keyword")}</th>
            <th className="px-3 py-3">{adminT("cms.cols.actions")}</th>
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
                    categoryStyles[post.category],
                  )}
                >
                  {adminT(`cms.categories.${post.category}`)}
                </span>
              </td>
              <td className="px-3 py-3">
                <p className="break-words font-semibold text-cb-text-strong">{post.title_en}</p>
                <p className="mt-0.5 break-words text-xs text-cb-text-muted" dir="rtl">
                  {post.title_ar}
                </p>
              </td>
              <td className="px-3 py-3">
                <code className="break-all rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                  {post.slug}
                </code>
                <p className="mt-1 text-[10px] text-cb-text-muted">/blog/{post.slug}</p>
              </td>
              <td className="break-words px-3 py-3 text-xs text-cb-text">{post.focus_keyword}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onCopySlug(post.slug)}
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
  );
}
