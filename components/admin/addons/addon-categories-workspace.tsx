"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FolderPlus,
  GitMerge,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  AdminBilingualLabel,
  AdminBilingualSection,
  useAdminBilingual,
} from "@/components/admin/admin-bilingual-label";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { fetchJson } from "@/lib/http/fetch-json";
import type { AddonCategory, AddonOption } from "@/lib/addons/types";
import { cn } from "@/lib/utils";

const emptyItem = (): AddonOption => ({
  id: "",
  name: "",
  weight_grams: null,
  price: 0,
  stock: null,
  quantity_limit: null,
  default_selected: false,
});

export function AddonCategoriesWorkspace() {
  const pick = useAdminBilingual();
  const [categories, setCategories] = useState<AddonCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSources, setMergeSources] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const [metaDraft, setMetaDraft] = useState({
    name: "",
    description: "",
    selection_type: "single_choice" as AddonCategory["selection_type"],
    required: false,
  });
  const [itemsDraft, setItemsDraft] = useState<AddonOption[]>([emptyItem()]);

  const selected = useMemo(
    () => categories.find((c) => c.id === selectedId) ?? null,
    [categories, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJson<{ categories: AddonCategory[] }>(
        "/api/admin/addon-categories",
        { cache: "no-store" },
      );
      const list = res.categories ?? [];
      setCategories(list);
      setSelectedId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
      setError(null);
    } catch {
      setError(pick({ en: "Failed to load categories.", ar: "فشل تحميل التصنيفات." }));
    } finally {
      setLoading(false);
    }
  }, [pick]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    setMetaDraft({
      name: selected.name,
      description: selected.description ?? "",
      selection_type: selected.selection_type,
      required: selected.required,
    });
    const items = selected.items?.length ? selected.items : [emptyItem()];
    setItemsDraft(items.map((i) => ({ ...i })));
  }, [selected]);

  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setError(pick({ en: "Category name is required.", ar: "اسم التصنيف مطلوب." }));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetchJson<{ category: AddonCategory }>("/api/admin/addon-categories", {
        method: "POST",
        jsonBody: {
          name,
          selection_type: "single_choice",
          required: false,
        },
      });
      setNewCategoryName("");
      setShowNewCategory(false);
      await load();
      setSelectedId(res.category.id);
    } catch {
      setError(pick({ en: "Failed to create category.", ar: "فشل إنشاء التصنيف." }));
    } finally {
      setSaving(false);
    }
  }

  async function saveMeta() {
    if (!selected) return;
    if (!metaDraft.name.trim()) {
      setError(pick({ en: "Category name is required.", ar: "اسم التصنيف مطلوب." }));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/api/admin/addon-categories", {
        method: "PATCH",
        jsonBody: {
          id: selected.id,
          name: metaDraft.name.trim(),
          description: metaDraft.description.trim() || null,
          selection_type: metaDraft.selection_type,
          required: metaDraft.required,
        },
      });
      await load();
    } catch {
      setError(pick({ en: "Failed to update category.", ar: "فشل تحديث التصنيف." }));
    } finally {
      setSaving(false);
    }
  }

  async function saveItems() {
    if (!selected) return;
    const cleaned = itemsDraft.filter((i) => i.name.trim());
    if (cleaned.length === 0) {
      setError(pick({ en: "Add at least one item.", ar: "أضف عنصراً واحداً على الأقل." }));
      return;
    }
    const missing = cleaned.findIndex((i) => !i.name.trim());
    if (missing >= 0) {
      setError(
        pick({
          en: `Item ${missing + 1} needs a name.`,
          ar: `العنصر ${missing + 1} يحتاج اسماً.`,
        }),
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/api/admin/addon-categories", {
        method: "PATCH",
        jsonBody: {
          action: "save_items",
          id: selected.id,
          items: cleaned,
        },
      });
      await load();
    } catch {
      setError(pick({ en: "Failed to save items.", ar: "فشل حفظ العناصر." }));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string) {
    if (
      !window.confirm(
        pick({
          en: "Delete this category and all its items?",
          ar: "حذف هذا التصنيف وكل عناصره؟",
        }),
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/api/admin/addon-categories", {
        method: "DELETE",
        jsonBody: { id },
      });
      if (selectedId === id) setSelectedId(null);
      await load();
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : pick({ en: "Failed to delete.", ar: "فشل الحذف." });
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function runMerge() {
    if (!selectedId || mergeSources.length === 0) return;
    if (
      !window.confirm(
        pick({
          en: "Merge selected categories into the current one? Source categories will be removed.",
          ar: "دمج التصنيفات المحددة في الحالي؟ سيتم حذف المصادر.",
        }),
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/api/admin/addon-categories", {
        method: "PATCH",
        jsonBody: {
          action: "merge",
          target_id: selectedId,
          source_ids: mergeSources,
        },
      });
      setMergeMode(false);
      setMergeSources([]);
      await load();
    } catch {
      setError(pick({ en: "Merge failed.", ar: "فشل الدمج." }));
    } finally {
      setSaving(false);
    }
  }

  function toggleMergeSource(id: string) {
    if (id === selectedId) return;
    setMergeSources((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const inputClass =
    "w-full rounded-lg border border-cb-border/70 bg-cb-surface px-3 py-2 text-sm text-cb-text-strong focus:border-cb-terracotta-dark focus:outline-none focus:ring-2 focus:ring-cb-terracotta-dark/20";

  return (
    <div className="space-y-6">
      <AdminPageIntro titleKey="adminPages.addons.title" subtitleKey="adminPages.addons.subtitle" />

      {error ? (
        <p className="rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <aside className="space-y-3 rounded-2xl border border-cb-border/70 bg-cb-surface/80 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-cb-text-strong">
              <Layers className="size-4 text-cb-terracotta-dark" />
              {pick({ en: "Categories", ar: "التصنيفات" })}
            </h2>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg bg-cb-terracotta-dark px-2.5 py-1.5 text-[11px] font-bold text-white"
              onClick={() => setShowNewCategory((v) => !v)}
            >
              <FolderPlus className="size-3.5" />
              {pick({ en: "New", ar: "جديد" })}
            </button>
          </div>

          {showNewCategory ? (
            <div className="space-y-2 rounded-xl border border-cb-terracotta-dark/25 bg-cb-peach/20 p-3">
              <input
                className={inputClass}
                placeholder={pick({ en: "Category name…", ar: "اسم التصنيف…" })}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button
                type="button"
                disabled={saving}
                className="w-full rounded-lg bg-cb-terracotta-dark py-2 text-xs font-bold text-white disabled:opacity-60"
                onClick={() => void createCategory()}
              >
                {pick({ en: "Create category", ar: "إنشاء التصنيف" })}
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition",
              mergeMode
                ? "border-cb-terracotta-dark bg-cb-peach/40 text-cb-terracotta-dark"
                : "border-cb-border/60 text-cb-text-muted hover:border-cb-terracotta-dark/40",
            )}
            onClick={() => {
              setMergeMode((v) => !v);
              setMergeSources([]);
            }}
          >
            <GitMerge className="size-3.5" />
            {pick({ en: "Merge categories", ar: "دمج تصنيفات" })}
          </button>

          {mergeMode && mergeSources.length > 0 ? (
            <button
              type="button"
              disabled={saving || !selectedId}
              className="w-full rounded-lg border border-cb-terracotta-dark bg-cb-terracotta-dark/10 py-2 text-xs font-bold text-cb-terracotta-dark disabled:opacity-50"
              onClick={() => void runMerge()}
            >
              {pick({
                en: `Merge ${mergeSources.length} into selected`,
                ar: `دمج ${mergeSources.length} في المحدد`,
              })}
            </button>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-8 text-cb-text-muted">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <p className="py-4 text-center text-xs text-cb-text-muted">
              {pick({ en: "No categories yet.", ar: "لا توجد تصنيفات بعد." })}
            </p>
          ) : (
            <ul className="max-h-[420px] space-y-1 overflow-y-auto">
              {categories.map((cat) => {
                const active = cat.id === selectedId;
                const mergeChecked = mergeSources.includes(cat.id);
                return (
                  <li key={cat.id}>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-2 py-1.5 transition",
                        active
                          ? "border-cb-terracotta-dark/50 bg-cb-peach/35"
                          : "border-transparent hover:bg-cb-hover-overlay",
                      )}
                    >
                      {mergeMode ? (
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--cb-terracotta-dark)]"
                          checked={mergeChecked}
                          disabled={cat.id === selectedId}
                          onChange={() => toggleMergeSource(cat.id)}
                        />
                      ) : null}
                      <button
                        type="button"
                        className="min-w-0 flex-1 py-1 text-start"
                        onClick={() => {
                          if (!mergeMode) setSelectedId(cat.id);
                        }}
                      >
                        <span className="block truncate text-sm font-semibold text-cb-text-strong">
                          {cat.name}
                        </span>
                        <span className="text-[10px] text-cb-text-muted">
                          {(cat.items?.length ?? 0)}{" "}
                          {pick({ en: "items", ar: "عنصر" })}
                          {cat.required
                            ? ` · ${pick({ en: "Required", ar: "إلزامي" })}`
                            : ""}
                        </span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="space-y-5">
          {!selected ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-cb-border/70 bg-cb-surface/50 p-8 text-sm text-cb-text-muted">
              {pick({
                en: "Select or create a category to manage items.",
                ar: "اختر تصنيفاً أو أنشئ واحداً لإدارة العناصر.",
              })}
            </div>
          ) : (
            <>
              <section className="admin-panel-surface rounded-2xl border border-cb-border/70 p-5 shadow-sm">
                <AdminBilingualSection
                  en="Category settings"
                  ar="إعدادات التصنيف"
                  className="mb-4"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <AdminBilingualLabel en="Category name" ar="اسم التصنيف" />
                    <input
                      className={inputClass}
                      value={metaDraft.name}
                      onChange={(e) =>
                        setMetaDraft((m) => ({ ...m, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <AdminBilingualLabel en="Description (optional)" ar="الوصف (اختياري)" />
                    <input
                      className={inputClass}
                      value={metaDraft.description}
                      onChange={(e) =>
                        setMetaDraft((m) => ({ ...m, description: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <AdminBilingualLabel en="Selection type" ar="نوع الاختيار" />
                    <select
                      className={inputClass}
                      value={metaDraft.selection_type}
                      onChange={(e) =>
                        setMetaDraft((m) => ({
                          ...m,
                          selection_type: e.target.value as AddonCategory["selection_type"],
                        }))
                      }
                    >
                      <option value="single_choice">
                        {pick({ en: "Single choice", ar: "اختيار واحد" })}
                      </option>
                      <option value="multiple_choice">
                        {pick({ en: "Multiple choice", ar: "اختيارات متعددة" })}
                      </option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-cb-text-strong">
                    <input
                      type="checkbox"
                      checked={metaDraft.required}
                      onChange={(e) =>
                        setMetaDraft((m) => ({ ...m, required: e.target.checked }))
                      }
                      className="size-4 accent-[var(--cb-terracotta-dark)]"
                    />
                    {pick({ en: "Required on product", ar: "إلزامي على المنتج" })}
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cb-terracotta-dark px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                    onClick={() => void saveMeta()}
                  >
                    <Pencil className="size-3.5" />
                    {pick({ en: "Save category", ar: "حفظ التصنيف" })}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700"
                    onClick={() => void deleteCategory(selected.id)}
                  >
                    <Trash2 className="size-3.5" />
                    {pick({ en: "Delete", ar: "حذف" })}
                  </button>
                </div>
              </section>

              <section className="admin-panel-surface rounded-2xl border border-cb-border/70 p-5 shadow-sm">
                <AdminBilingualSection
                  en="Add-on items"
                  ar="عناصر الإضافة"
                  className="mb-4"
                />
                <p className="mb-3 text-xs text-cb-text-muted">
                  {pick({
                    en: "Each row is one choice customers see — set name, weight (g), price (EGP), and available stock.",
                    ar: "كل صف = خيار يظهر للعميل — الاسم، الوزن (جم)، السعر (جنيه)، والمخزون المتاح.",
                  })}
                </p>
                <div className="overflow-x-auto rounded-xl border border-cb-border/70">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-cb-border/60 bg-cb-peach/20 text-start text-[11px] font-bold uppercase tracking-wide text-cb-text-muted">
                        <th className="px-3 py-2">{pick({ en: "Name", ar: "الاسم" })}</th>
                        <th className="px-3 py-2">{pick({ en: "Weight (g)", ar: "الوزن (جم)" })}</th>
                        <th className="px-3 py-2">{pick({ en: "Price", ar: "السعر" })}</th>
                        <th className="px-3 py-2">{pick({ en: "Stock", ar: "المخزون" })}</th>
                        <th className="px-3 py-2">{pick({ en: "Default", ar: "افتراضي" })}</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {itemsDraft.map((item, idx) => (
                        <tr key={idx} className="border-b border-cb-border/40 last:border-0">
                          <td className="px-2 py-2">
                            <input
                              className={inputClass}
                              value={item.name}
                              placeholder={pick({ en: "Item name", ar: "اسم العنصر" })}
                              onChange={(e) =>
                                setItemsDraft((rows) =>
                                  rows.map((r, i) =>
                                    i === idx ? { ...r, name: e.target.value } : r,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              className={cn(inputClass, "w-24")}
                              value={item.weight_grams ?? ""}
                              placeholder="—"
                              onChange={(e) =>
                                setItemsDraft((rows) =>
                                  rows.map((r, i) =>
                                    i === idx
                                      ? {
                                          ...r,
                                          weight_grams: e.target.value
                                            ? Number(e.target.value)
                                            : null,
                                        }
                                      : r,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className={cn(inputClass, "w-24")}
                              value={item.price}
                              onChange={(e) =>
                                setItemsDraft((rows) =>
                                  rows.map((r, i) =>
                                    i === idx
                                      ? { ...r, price: Number(e.target.value) || 0 }
                                      : r,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              className={cn(inputClass, "w-24")}
                              value={item.stock ?? ""}
                              placeholder={pick({ en: "∞", ar: "∞" })}
                              onChange={(e) =>
                                setItemsDraft((rows) =>
                                  rows.map((r, i) =>
                                    i === idx
                                      ? {
                                          ...r,
                                          stock: e.target.value
                                            ? Number(e.target.value)
                                            : null,
                                        }
                                      : r,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={item.default_selected}
                              className="size-4 accent-[var(--cb-terracotta-dark)]"
                              onChange={(e) =>
                                setItemsDraft((rows) =>
                                  rows.map((r, i) =>
                                    i === idx
                                      ? { ...r, default_selected: e.target.checked }
                                      : r,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                              onClick={() =>
                                setItemsDraft((rows) =>
                                  rows.length <= 1 ? rows : rows.filter((_, i) => i !== idx),
                                )
                              }
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-cb-border px-3 py-2 text-xs font-semibold"
                    onClick={() => setItemsDraft((rows) => [...rows, emptyItem()])}
                  >
                    <Plus className="size-3.5" />
                    {pick({ en: "Add item", ar: "إضافة عنصر" })}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cb-terracotta-dark px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                    onClick={() => void saveItems()}
                  >
                    {saving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    {pick({ en: "Save items", ar: "حفظ العناصر" })}
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
