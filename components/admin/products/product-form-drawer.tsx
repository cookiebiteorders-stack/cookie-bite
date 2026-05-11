"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import type { AdminProductRow } from "@/lib/admin/products-dashboard-types";
import { EMPTY_PRODUCT_FORM, type ProductFormState } from "@/lib/admin/products-dashboard-types";
import { useProductsDashboardStore } from "@/stores/products-dashboard-store";
import { cn } from "@/lib/utils";

type FormErrors = Partial<Record<keyof ProductFormState, string>>;

function rowToForm(item: AdminProductRow): ProductFormState {
  return {
    name: item.name ?? "",
    title_en: item.title_en ?? "",
    title_ar: item.title_ar ?? "",
    description_en: item.description_en ?? "",
    description_ar: item.description_ar ?? "",
    ingredients: (item.dietary ?? []).join(", "),
    category: item.category ?? "",
    sku: item.sku ?? "",
    price_egp: String(item.price_egp ?? ""),
    compare_price_egp:
      item.compare_price_egp != null && Number.isFinite(Number(item.compare_price_egp))
        ? String(item.compare_price_egp)
        : "",
    stock: String(item.stock ?? 0),
    low_stock_threshold: "10",
    image_url: item.image_url ?? "",
    is_active: item.is_active,
    meta_title: (item.title_en ?? item.name ?? "").slice(0, 70),
    meta_description: (item.description_en ?? "").slice(0, 160),
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AdminProductRow | null;
  canWrite: boolean;
};

export function ProductFormDrawer({ open, onOpenChange, editing, canWrite }: Props) {
  const reduceMotion = useReducedMotion();
  const pushToast = useProductsDashboardStore((s) => s.pushToast);
  const loadProducts = useProductsDashboardStore((s) => s.loadProducts);

  const [form, setForm] = useState<ProductFormState>(() =>
    editing ? rowToForm(editing) : EMPTY_PRODUCT_FORM,
  );
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const formErrors = useMemo<FormErrors>(() => {
    const errors: FormErrors = {};
    if (form.name.trim().length < 2) errors.name = "الاسم مطلوب (حرفان على الأقل).";
    const price = Number(form.price_egp);
    if (!Number.isFinite(price) || price <= 0) errors.price_egp = "سعر صالح مطلوب.";
    const stock = Number(form.stock);
    if (!Number.isFinite(stock) || stock < 0) errors.stock = "المخزون يجب أن يكون ≥ 0.";
    const cp = form.compare_price_egp.trim();
    if (cp) {
      const cpn = Number(cp);
      if (!Number.isFinite(cpn) || cpn <= 0) errors.compare_price_egp = "سعر مقارنة غير صالح.";
    }
    if (form.image_url.trim() && !URL.canParse(form.image_url.trim())) {
      errors.image_url = "رابط الصورة غير صالح.";
    }
    if (form.description_en.length > 3000) errors.description_en = "الحد الأقصى 3000 حرف.";
    if (form.description_ar.length > 3000) errors.description_ar = "الحد الأقصى 3000 حرف.";
    return errors;
  }, [form]);

  const hasBlockingErrors =
    Boolean(formErrors.name) ||
    Boolean(formErrors.price_egp) ||
    Boolean(formErrors.stock) ||
    Boolean(formErrors.compare_price_egp) ||
    Boolean(formErrors.image_url) ||
    Boolean(formErrors.description_en) ||
    Boolean(formErrors.description_ar);

  const stepDone = useMemo(
    () => ({
      1:
        form.name.trim().length >= 2 &&
        !formErrors.name &&
        (!form.sku.trim() || form.sku.trim().length >= 2),
      2:
        !formErrors.description_en &&
        !formErrors.description_ar &&
        (form.description_en.trim().length > 0 || form.description_ar.trim().length > 0),
      3:
        !formErrors.price_egp &&
        !formErrors.stock &&
        !formErrors.image_url &&
        !formErrors.compare_price_egp &&
        Number(form.price_egp) > 0 &&
        Number(form.stock) >= 0,
    }),
    [form, formErrors],
  );

  const canEnterStep = useMemo(
    () => ({
      1: true,
      2: stepDone[1],
      3: stepDone[1] && stepDone[2],
    }),
    [stepDone],
  );

  const handleImageUpload = useCallback(
    async (file: File | null) => {
      if (!file || !canWrite) return;
      setUploadingImage(true);
      setUploadError(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/products/upload-image", { method: "POST", body: fd });
        const data = (await res.json().catch(() => null)) as
          | { image?: { url?: string }; error?: { en?: string } }
          | null;
        if (!res.ok || !data?.image?.url) {
          throw new Error(data?.error?.en || "فشل رفع الصورة");
        }
        setForm((f) => ({ ...f, image_url: data.image?.url ?? "" }));
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "فشل الرفع");
      } finally {
        setUploadingImage(false);
      }
    },
    [canWrite],
  );

  const applyAiDescription = useCallback(() => {
    const base = form.name.trim() || form.title_en.trim();
    if (!base) {
      pushToast("اكتب اسم المنتج أولاً لتوليد مسودة وصف.", "info");
      return;
    }
    const draft = `${base} — كوكيز طازجة يدوية الصنع، توصيل سريع، مكونات مختارة بعناية.`;
    setForm((f) => ({
      ...f,
      description_en: f.description_en.trim() ? f.description_en : draft,
      description_ar: f.description_ar.trim()
        ? f.description_ar
        : `${base} — جودة عالية، طعم غني، مناسب للهدايا والمناسبات.`,
    }));
    pushToast("تم إدراج مسودة وصف (يمكن تعديلها قبل الحفظ).", "success");
  }, [form.name, form.title_en, pushToast]);

  const submitForm = useCallback(async () => {
    if (!canWrite || saving) return;
    if (hasBlockingErrors) {
      pushToast("صحح الحقول المظللة قبل الحفظ.", "error");
      return;
    }
    setSaving(true);
    try {
      const ingredientsList = form.ingredients
        .split(/[\n,]/g)
        .map((x) => x.trim())
        .filter(Boolean);
      const compareRaw = form.compare_price_egp.trim();
      const compare_price_egp =
        compareRaw && Number.isFinite(Number(compareRaw)) ? Number(compareRaw) : null;

      const payload = {
        name: form.name.trim(),
        title_en: form.title_en.trim() || null,
        title_ar: form.title_ar.trim() || null,
        description_en: form.description_en.trim() || null,
        description_ar: form.description_ar.trim() || null,
        description: form.description_en.trim() || form.description_ar.trim() || null,
        dietary: ingredientsList,
        category: form.category.trim() || null,
        sku: form.sku.trim() || null,
        price_egp: Number(form.price_egp),
        compare_price_egp,
        stock: Number(form.stock || 0),
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
      };
      if (!payload.name || !Number.isFinite(payload.price_egp) || payload.price_egp <= 0) {
        throw new Error("الاسم والسعر مطلوبان");
      }
      if (editing) {
        await fetchJson("/api/admin/products", {
          method: "PATCH",
          jsonBody: { ids: [editing.id], patch: payload },
        });
      } else {
        await fetchJson("/api/admin/products", { method: "POST", jsonBody: payload });
      }
      pushToast(editing ? "تم تحديث المنتج." : "تم إنشاء المنتج.", "success");
      onOpenChange(false);
      await loadProducts();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  }, [canWrite, saving, hasBlockingErrors, form, editing, pushToast, onOpenChange, loadProducts]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[85] flex justify-end bg-black/40 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-title"
            initial={reduceMotion ? false : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { x: 28, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={cn(
              "flex h-full w-full max-w-xl flex-col border-s border-cb-border bg-gradient-to-b from-amber-50/40 via-white to-white shadow-2xl",
              "dark:from-stone-950 dark:via-cb-surface-elevated dark:to-cb-surface-elevated",
            )}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-cb-border px-5 py-4">
              <div>
                <h2 id="product-form-title" className="font-serif text-xl font-bold text-stone-900 dark:text-stone-50">
                  {editing ? "تعديل منتج" : "إضافة منتج"}
                </h2>
                <p className="mt-1 text-xs text-cb-text-muted">
                  مسارات منظمة — وسّع الحقول لاحقاً بربط أعمدة SEO إن رغبت.
                </p>
              </div>
              <button
                type="button"
                className="rounded-xl border border-cb-border p-2 text-cb-text-muted transition hover:bg-cb-surface-2 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400"
                onClick={() => onOpenChange(false)}
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 border-b border-cb-border bg-cb-surface/60 px-3 py-2 text-[11px] font-bold">
              {[
                { id: 1 as const, label: "أساسي" },
                { id: 2 as const, label: "محتوى" },
                { id: 3 as const, label: "وسائط وسعر" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={!canEnterStep[s.id]}
                  onClick={() => {
                    if (!canEnterStep[s.id]) return;
                    setFormStep(s.id);
                  }}
                  className={cn(
                    "rounded-lg px-2 py-2 transition",
                    formStep === s.id
                      ? "bg-amber-600 text-white shadow-sm"
                      : canEnterStep[s.id]
                        ? "text-stone-700 hover:bg-white dark:text-stone-200 dark:hover:bg-stone-800"
                        : "cursor-not-allowed text-cb-text-muted/50",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={cn("space-y-1", formStep !== 1 && "hidden")}>
                  <span className="text-xs font-semibold text-cb-text-muted">اسم المنتج *</span>
                  <input
                    className="w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  {formErrors.name ? <p className="text-xs text-red-600">{formErrors.name}</p> : null}
                </label>
                <label className={cn("space-y-1", formStep !== 1 && "hidden")}>
                  <span className="text-xs font-semibold text-cb-text-muted">SKU</span>
                  <input
                    className="w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  />
                </label>
                <label className={cn("space-y-1", formStep !== 1 && "hidden")}>
                  <span className="text-xs font-semibold text-cb-text-muted">Title EN</span>
                  <input
                    className="w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                    value={form.title_en}
                    onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
                  />
                </label>
                <label className={cn("space-y-1", formStep !== 1 && "hidden")}>
                  <span className="text-xs font-semibold text-cb-text-muted">Title AR</span>
                  <input
                    className="w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                    value={form.title_ar}
                    onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))}
                  />
                </label>

                <div className={cn("sm:col-span-2 space-y-2", formStep !== 2 && "hidden")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-cb-text-muted">الوصف</span>
                    <button
                      type="button"
                      onClick={applyAiDescription}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
                    >
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      مساعد وصف (مسودة)
                    </button>
                  </div>
                </div>
                <label className={cn("space-y-1 sm:col-span-2", formStep !== 2 && "hidden")}>
                  <span className="text-xs font-semibold text-cb-text-muted">Description EN</span>
                  <textarea
                    className="min-h-24 w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                    value={form.description_en}
                    onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
                  />
                  {formErrors.description_en ? (
                    <p className="text-xs text-red-600">{formErrors.description_en}</p>
                  ) : null}
                </label>
                <label className={cn("space-y-1 sm:col-span-2", formStep !== 2 && "hidden")}>
                  <span className="text-xs font-semibold text-cb-text-muted">Description AR</span>
                  <textarea
                    className="min-h-24 w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                    value={form.description_ar}
                    onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
                  />
                  {formErrors.description_ar ? (
                    <p className="text-xs text-red-600">{formErrors.description_ar}</p>
                  ) : null}
                </label>
                <label className={cn("space-y-1 sm:col-span-2", formStep !== 2 && "hidden")}>
                  <span className="text-xs font-semibold text-cb-text-muted">المكونات (مفصولة بفاصلة)</span>
                  <textarea
                    className="min-h-20 w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                    value={form.ingredients}
                    onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
                  />
                </label>

                <div
                  className={cn(
                    "sm:col-span-2 rounded-xl border border-dashed border-amber-200/80 bg-amber-50/30 p-3 dark:border-amber-900/50 dark:bg-amber-950/10",
                    formStep !== 2 && "hidden",
                  )}
                >
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">SEO (معاينة)</p>
                  <p className="mt-1 text-[11px] text-cb-text-muted">
                    الحقول التالية للتخطيط فقط؛ يُنصح بمزامنة العنوان والوصف أعلاه مع محركات البحث.
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold text-cb-text-muted">Meta title</span>
                      <input
                        className="w-full rounded-lg border border-cb-border bg-white px-2 py-1.5 text-xs dark:bg-stone-900"
                        value={form.meta_title}
                        onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
                      />
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-[11px] font-semibold text-cb-text-muted">Meta description</span>
                      <textarea
                        className="min-h-16 w-full rounded-lg border border-cb-border bg-white px-2 py-1.5 text-xs dark:bg-stone-900"
                        value={form.meta_description}
                        onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
                      />
                    </label>
                  </div>
                </div>

                <label className={cn("space-y-1", formStep !== 3 && "hidden")}>
                  <span className="text-xs font-semibold text-cb-text-muted">التصنيف</span>
                  <input
                    className="w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  />
                </label>
                <label className={cn("space-y-1", formStep !== 3 && "hidden")}>
                  <span className="text-xs font-semibold text-cb-text-muted">السعر (ج.م) *</span>
                  <input
                    className="w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price_egp}
                    onChange={(e) => setForm((f) => ({ ...f, price_egp: e.target.value }))}
                  />
                  {formErrors.price_egp ? <p className="text-xs text-red-600">{formErrors.price_egp}</p> : null}
                </label>
                <label className={cn("space-y-1", formStep !== 3 && "hidden")}>
                  <span className="text-xs font-semibold text-cb-text-muted">سعر مقارنة / خصم (اختياري)</span>
                  <input
                    className="w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="اتركه فارغاً إن لم يُستخدم"
                    value={form.compare_price_egp}
                    onChange={(e) => setForm((f) => ({ ...f, compare_price_egp: e.target.value }))}
                  />
                  {formErrors.compare_price_egp ? (
                    <p className="text-xs text-red-600">{formErrors.compare_price_egp}</p>
                  ) : null}
                </label>
                <label className={cn("space-y-1", formStep !== 3 && "hidden")}>
                  <span className="text-xs font-semibold text-cb-text-muted">المخزون</span>
                  <input
                    className="w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  />
                  {formErrors.stock ? <p className="text-xs text-red-600">{formErrors.stock}</p> : null}
                </label>
                <label className={cn("space-y-1", formStep !== 3 && "hidden")}>
                  <span className="text-xs font-semibold text-cb-text-muted">عتبة تنبيه مخزون (واجهة فقط)</span>
                  <input
                    className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-3 py-2 text-sm opacity-70"
                    type="number"
                    disabled
                    value={form.low_stock_threshold}
                    readOnly
                  />
                </label>
                <label
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border border-cb-border px-3 py-2 text-sm",
                    formStep !== 3 && "hidden",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  نشط (ظاهر للعملاء)
                </label>

                <div className={cn("sm:col-span-2 rounded-xl border border-cb-border bg-cb-surface/50 p-3", formStep !== 3 && "hidden")}>
                  <p className="text-xs font-semibold text-cb-text-muted">صورة المنتج</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      className="rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                      placeholder="https://..."
                      value={form.image_url}
                      onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                    />
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold hover:bg-cb-surface-2">
                      {uploadingImage ? "جاري الرفع…" : "رفع من الجهاز"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        disabled={uploadingImage || !canWrite}
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          void handleImageUpload(file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {uploadError ? <p className="mt-2 text-xs text-red-600">{uploadError}</p> : null}
                  {formErrors.image_url ? <p className="mt-2 text-xs text-red-600">{formErrors.image_url}</p> : null}
                  {form.image_url ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-cb-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.image_url} alt="" className="h-36 w-full object-cover" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-cb-border bg-white/90 px-5 py-4 dark:bg-stone-950/80">
              <button
                type="button"
                className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                disabled={formStep === 1}
                onClick={() => setFormStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
              >
                رجوع
              </button>
              <button
                type="button"
                className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                disabled={formStep === 3 || !stepDone[formStep]}
                onClick={() => setFormStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))}
              >
                التالي
              </button>
              <button
                type="button"
                className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={saving || !canWrite || hasBlockingErrors}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
                onClick={() => void submitForm()}
              >
                {saving ? "جاري الحفظ…" : editing ? "تحديث" : "إنشاء"}
              </button>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
