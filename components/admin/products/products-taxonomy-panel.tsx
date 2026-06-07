"use client";

import { useEffect, useState } from "react";
import { FolderTree, Loader2, Tag } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";

type CategoryRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
};

type TagRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
};

type Props = {
  canWrite: boolean;
  onTaxonomyChange?: () => void;
};

export function ProductsTaxonomyPanel({ canWrite, onTaxonomyChange }: Props) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryNameAr, setCategoryNameAr] = useState("");
  const [tagName, setTagName] = useState("");

  const reload = () => {
    setLoading(true);
    void fetchJson<{ categories: CategoryRow[]; tags: TagRow[] }>("/api/admin/products/taxonomy", {
      cache: "no-store",
    })
      .then((res) => {
        setCategories(res.categories ?? []);
        setTags(res.tags ?? []);
      })
      .catch(() => {
        setCategories([]);
        setTags([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const createCategory = async () => {
    if (!categoryName.trim() || !canWrite) return;
    setBusy(true);
    try {
      await fetchJson("/api/admin/products/taxonomy", {
        method: "POST",
        jsonBody: {
          type: "category",
          name_en: categoryName.trim(),
          name_ar: categoryNameAr.trim() || null,
        },
      });
      setCategoryName("");
      setCategoryNameAr("");
      reload();
      onTaxonomyChange?.();
    } finally {
      setBusy(false);
    }
  };

  const createTag = async () => {
    if (!tagName.trim() || !canWrite) return;
    setBusy(true);
    try {
      await fetchJson("/api/admin/products/taxonomy", {
        method: "POST",
        jsonBody: { type: "tag", name_en: tagName.trim() },
      });
      setTagName("");
      reload();
      onTaxonomyChange?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4 rounded-2xl border border-cb-border/80 bg-cb-surface-elevated/90 p-4 lg:grid-cols-2">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-cb-text-strong">
          <FolderTree className="h-4 w-4" aria-hidden />
          التصنيفات (Categories)
        </h3>
        {canWrite ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              disabled={busy}
              placeholder="اسم EN"
              className="rounded-lg border border-cb-border px-2 py-1.5 text-xs"
            />
            <input
              value={categoryNameAr}
              onChange={(e) => setCategoryNameAr(e.target.value)}
              disabled={busy}
              placeholder="اسم AR (اختياري)"
              className="rounded-lg border border-cb-border px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void createCategory()}
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 sm:col-span-2 sm:w-fit"
            >
              إضافة تصنيف
            </button>
          </div>
        ) : null}
        {loading ? (
          <p className="mt-2 text-xs text-cb-text-muted">
            <Loader2 className="inline h-3 w-3 animate-spin" /> …
          </p>
        ) : (
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex justify-between gap-2 rounded-lg bg-white/70 px-2 py-1 dark:bg-cb-surface"
              >
                <span>{c.name_ar ?? c.name_en}</span>
                <span className="text-cb-text-muted">{c.slug}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-cb-text-strong">
          <Tag className="h-4 w-4" aria-hidden />
          الوسوم (Tags)
        </h3>
        {canWrite ? (
          <div className="mt-2 flex gap-2">
            <input
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              disabled={busy}
              placeholder="اسم الوسم (EN)"
              className="flex-1 rounded-lg border border-cb-border px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void createTag()}
              className="rounded-lg border border-cb-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
            >
              إضافة
            </button>
          </div>
        ) : null}
        {loading ? null : (
          <ul className="mt-2 flex max-h-32 flex-wrap gap-1 overflow-y-auto">
            {tags.length === 0 ? (
              <li className="text-xs text-cb-text-muted">لا وسوم بعد.</li>
            ) : (
              tags.map((t) => (
                <li
                  key={t.id}
                  className={cn(
                    "rounded-full border border-cb-border/80 bg-white px-2 py-0.5 text-[10px] font-semibold dark:bg-cb-surface",
                  )}
                >
                  {t.name_ar ?? t.name_en}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
