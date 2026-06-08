"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAnnouncements } from "@/components/providers/announcement-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

export default function UpdatesPage() {
  const { announcements, loaded } = useAnnouncements();
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const feed = useMemo(() => {
    const base = announcements.filter(
      (a) => a.type === "notification" || a.type === "system" || a.type === "banner",
    );
    return base.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) || item.message.toLowerCase().includes(q)
      );
    });
  }, [announcements, query, typeFilter]);

  return (
    <div className="cb-page-section mx-auto max-w-3xl cb-gutter py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-cb-text-strong">{t("announcements.feedTitle")}</h1>
        <p className="mt-2 text-cb-text">{t("announcements.feedSubtitle")}</p>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cb-text-muted" />
          <input
            type="search"
            className="w-full rounded-xl border border-cb-border/60 bg-cb-surface py-2.5 ps-10 pe-3 text-sm"
            placeholder={t("announcements.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border border-cb-border/60 bg-cb-surface px-3 py-2.5 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">{t("announcements.filter.all")}</option>
          <option value="notification">{t("announcements.filter.notification")}</option>
          <option value="banner">banner</option>
          <option value="system">{t("announcements.filter.system")}</option>
        </select>
      </div>

      {!loaded ? (
        <p className="text-sm text-cb-text-muted">{t("announcements.loading")}</p>
      ) : feed.length === 0 ? (
        <p className="rounded-xl border border-cb-border/50 bg-cb-surface-2/40 px-4 py-8 text-center text-sm text-cb-text-muted">
          {t("announcements.empty")}
        </p>
      ) : (
        <ul className="space-y-4">
          {feed.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-cb-border/50 bg-cb-surface p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
                    "bg-cb-peach/50 text-cb-terracotta-dark",
                  )}
                >
                  {item.type}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-semibold text-cb-text-strong">{item.title}</h2>
              <p className="mt-1 text-sm text-cb-text">{item.message}</p>
              {item.cta ? (
                <Link
                  href={item.cta.url}
                  className="mt-3 inline-block text-sm font-semibold text-cb-terracotta-dark no-underline hover:underline"
                >
                  {item.cta.label}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
