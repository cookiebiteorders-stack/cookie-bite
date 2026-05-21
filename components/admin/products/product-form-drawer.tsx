"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Cookie,
  FileText,
  Images,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import type { AdminProductRow } from "@/lib/admin/products-dashboard-types";
import {
  EMPTY_PRODUCT_FORM,
  formToApiPayload,
  rowToProductForm,
  type ProductFormState,
} from "@/lib/admin/products-dashboard-types";
import { ProductMediaEditor } from "@/components/admin/products/product-media-editor";
import { useProductsDashboardStore } from "@/stores/products-dashboard-store";
import { cn } from "@/lib/utils";

type FormErrors = Partial<Record<keyof ProductFormState, string>>;

const FORM_STEPS = [
  { id: 1 as const, label: "أساسي", hint: "الاسم والهوية", icon: Tag },
  { id: 2 as const, label: "محتوى", hint: "الوصف والمكونات", icon: FileText },
  { id: 3 as const, label: "وسائط وسعر", hint: "صور، سعر، مخزون", icon: Images },
] as const;

const inputClass =
  "cb-field w-full rounded-2xl border-2 border-cb-border/80 bg-white px-4 py-2.5 text-sm font-medium text-cb-text-strong shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] transition-all duration-200 placeholder:text-cb-text-placeholder focus:outline-none";

const inputErrorClass =
  "border-red-300/90 bg-red-50/50 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]";

const labelClass =
  "flex items-center gap-1.5 text-xs font-bold tracking-wide text-cb-text-strong";

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

  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? rowToProductForm(editing) : EMPTY_PRODUCT_FORM);
    setFormStep(1);
  }, [open, editing]);

  const formErrors = useMemo<FormErrors>(() => {
    const errors: FormErrors = {};
    if (form.name.trim().length < 2) errors.name = "الاسم مطلوب (حرفان على الأقل).";
    if (form.slug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      errors.slug = "Slug: أحرف إنجليزية صغيرة وأرقام وشرطات فقط.";
    }
    const price = Number(form.price_egp);
    if (!Number.isFinite(price) || price <= 0) errors.price_egp = "سعر صالح مطلوب.";
    const stock = Number(form.stock);
    if (!Number.isFinite(stock) || stock < 0) errors.stock = "المخزون يجب أن يكون ≥ 0.";
    const cp = form.compare_price_egp.trim();
    if (cp) {
      const cpn = Number(cp);
      if (!Number.isFinite(cpn) || cpn <= 0) errors.compare_price_egp = "سعر مقارنة غير صالح.";
    }
    for (const img of form.images) {
      const u = img.url.trim();
      if (u && !URL.canParse(u)) {
        errors.images = "أحد روابط الصور غير صالح.";
        break;
      }
    }
    const video = form.video_url.trim();
    if (video && !URL.canParse(video)) errors.video_url = "رابط الفيديو غير صالح.";
    if (form.description_en.length > 3000) errors.description_en = "الحد الأقصى 3000 حرف.";
    if (form.description_ar.length > 3000) errors.description_ar = "الحد الأقصى 3000 حرف.";
    return errors;
  }, [form]);

  const hasBlockingErrors =
    Boolean(formErrors.name) ||
    Boolean(formErrors.slug) ||
    Boolean(formErrors.price_egp) ||
    Boolean(formErrors.stock) ||
    Boolean(formErrors.compare_price_egp) ||
    Boolean(formErrors.images) ||
    Boolean(formErrors.video_url) ||
    Boolean(formErrors.description_en) ||
    Boolean(formErrors.description_ar);

  const stepDone = useMemo(
    () => ({
      1:
        form.name.trim().length >= 2 &&
        !formErrors.name &&
        !formErrors.slug &&
        (!form.sku.trim() || form.sku.trim().length >= 2),
      2:
        !formErrors.description_en &&
        !formErrors.description_ar &&
        (form.description_en.trim().length > 0 || form.description_ar.trim().length > 0),
      3:
        !formErrors.price_egp &&
        !formErrors.stock &&
        !formErrors.images &&
        !formErrors.video_url &&
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
      const payload = formToApiPayload(form);
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
      pushToast(editing ? "تم تحديث المنتج — يمكنك تعديله مجدداً من الجدول." : "تم إنشاء المنتج.", "success");
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
          className="fixed inset-0 z-[85] flex justify-end bg-[#3D2814]/45 backdrop-blur-md"
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
            initial={reduceMotion ? false : { x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { x: 32, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="flex h-full w-full max-w-xl flex-col overflow-hidden border-s border-cb-border/80 bg-gradient-to-b from-[#FFFBF5] via-cb-surface-elevated to-[#F8EDE0] shadow-[-16px_0_40px_-10px_rgba(61,40,20,0.35)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden border-b border-white/20 px-5 pb-5 pt-5">
              <div
                className="pointer-events-none absolute -end-8 -top-10 h-36 w-36 rounded-full bg-amber-300/40 blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-6 start-8 h-28 w-28 rounded-full bg-cb-terracotta-dark/25 blur-2xl"
                aria-hidden
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cb-terracotta-dark to-amber-600 text-white shadow-lg shadow-cb-terracotta-dark/30">
                    {editing ? (
                      <Tag className="h-5 w-5" aria-hidden />
                    ) : (
                      <Cookie className="h-5 w-5" aria-hidden />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cb-terracotta-dark/80">
                      {editing ? "تحديث الكتالوج" : "منتج جديد"}
                    </p>
                    <h2
                      id="product-form-title"
                      className="font-serif text-2xl font-bold leading-tight text-cb-text-strong"
                    >
                      {editing ? "تعديل منتج" : "إضافة منتج"}
                    </h2>
                    <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-cb-text-muted">
                      ٣ خطوات سريعة — صور، فيديو، شارات، ومواسم. كل شيء جاهز للمتجر.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-2xl border border-white/60 bg-white/70 p-2.5 text-cb-text-muted shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white hover:text-cb-text-strong focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400"
                  onClick={() => onOpenChange(false)}
                  aria-label="إغلاق"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="border-b border-cb-border/60 bg-white/50 px-4 py-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between gap-2 text-[11px] font-semibold text-cb-text-muted">
                <span>
                  الخطوة {formStep} من ٣
                </span>
                <span className="tabular-nums text-cb-terracotta-dark">
                  {Math.round((formStep / 3) * 100)}%
                </span>
              </div>
              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-cb-border/50">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-l from-amber-500 via-cb-terracotta-dark to-[#8B3A2A]"
                  initial={false}
                  animate={{ width: `${(formStep / 3) * 100}%` }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {FORM_STEPS.map((s) => {
                  const Icon = s.icon;
                  const active = formStep === s.id;
                  const done = stepDone[s.id];
                  const enabled = canEnterStep[s.id];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!enabled}
                      onClick={() => {
                        if (!enabled) return;
                        setFormStep(s.id);
                      }}
                      className={cn(
                        "group relative flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-2.5 text-center transition-all duration-200",
                        active
                          ? "border-cb-terracotta-dark bg-gradient-to-b from-cb-terracotta-dark to-[#9E4528] text-white shadow-md shadow-cb-terracotta-dark/25"
                          : done
                            ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-900"
                            : enabled
                              ? "border-cb-border/70 bg-white/80 text-cb-text-strong hover:border-amber-300 hover:bg-amber-50/80 hover:shadow-sm"
                              : "cursor-not-allowed border-transparent bg-cb-surface/40 text-cb-text-muted/45",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition",
                          active
                            ? "bg-white/20 text-white"
                            : done
                              ? "bg-emerald-500 text-white"
                              : "bg-cb-peach/80 text-cb-terracotta-dark group-hover:bg-amber-200",
                        )}
                      >
                        {done && !active ? (
                          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                        ) : (
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </span>
                      <span className="text-[11px] font-bold leading-tight">{s.label}</span>
                      <span
                        className={cn(
                          "text-[9px] font-medium leading-tight opacity-80",
                          active ? "text-white/85" : "",
                        )}
                      >
                        {s.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-transparent via-white/30 to-transparent px-5 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={formStep}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="grid gap-4 sm:grid-cols-2"
                >
                <label className={cn("space-y-2", formStep !== 1 && "hidden")}>
                  <span className={labelClass}>اسم المنتج *</span>
                  <input
                    className={cn(inputClass, formErrors.name && inputErrorClass)}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  {formErrors.name ? (
                    <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                      {formErrors.name}
                    </p>
                  ) : null}
                </label>
                <label className={cn("space-y-2", formStep !== 1 && "hidden")}>
                  <span className={labelClass}>
                    Slug (رابط المتجر){editing ? " — قابل للتعديل" : ""}
                  </span>
                  <input
                    className={cn(inputClass, formErrors.slug && inputErrorClass)}
                    placeholder="chocolate-chip-cookie"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  />
                  {formErrors.slug ? (
                    <p className="text-xs font-medium text-red-600">{formErrors.slug}</p>
                  ) : null}
                </label>
                <label className={cn("space-y-2", formStep !== 1 && "hidden")}>
                  <span className={labelClass}>SKU</span>
                  <input
                    className={inputClass}
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  />
                </label>
                <label className={cn("space-y-2", formStep !== 1 && "hidden")}>
                  <span className={labelClass}>Title EN</span>
                  <input
                    className={inputClass}
                    value={form.title_en}
                    onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
                  />
                </label>
                <label className={cn("space-y-2", formStep !== 1 && "hidden")}>
                  <span className={labelClass}>Title AR</span>
                  <input
                    className={inputClass}
                    dir="rtl"
                    value={form.title_ar}
                    onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))}
                  />
                </label>
                <label className={cn("space-y-2", formStep !== 1 && "hidden")}>
                  <span className={labelClass}>شارات (featured, bestseller)</span>
                  <input
                    className={inputClass}
                    placeholder="featured, new"
                    value={form.badges}
                    onChange={(e) => setForm((f) => ({ ...f, badges: e.target.value }))}
                  />
                </label>
                <label className={cn("space-y-2", formStep !== 1 && "hidden")}>
                  <span className={labelClass}>مواسم</span>
                  <input
                    className={inputClass}
                    placeholder="ramadan, summer"
                    value={form.seasons}
                    onChange={(e) => setForm((f) => ({ ...f, seasons: e.target.value }))}
                  />
                </label>

                <div className={cn("sm:col-span-2 space-y-2", formStep !== 2 && "hidden")}>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200/80 bg-gradient-to-l from-amber-50 to-orange-50/80 px-4 py-3">
                    <span className={labelClass}>الوصف</span>
                    <button
                      type="button"
                      onClick={applyAiDescription}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-amber-500 to-cb-terracotta-dark px-4 py-1.5 text-[11px] font-bold text-white shadow-md shadow-amber-500/30 transition hover:scale-[1.02] hover:brightness-110"
                    >
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      مساعد وصف (مسودة)
                    </button>
                  </div>
                </div>
                <label className={cn("space-y-2 sm:col-span-2", formStep !== 2 && "hidden")}>
                  <span className={labelClass}>Description EN</span>
                  <textarea
                    className={cn(inputClass, "min-h-28 resize-y")}
                    value={form.description_en}
                    onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
                  />
                  {formErrors.description_en ? (
                    <p className="text-xs font-medium text-red-600">{formErrors.description_en}</p>
                  ) : null}
                </label>
                <label className={cn("space-y-2 sm:col-span-2", formStep !== 2 && "hidden")}>
                  <span className={labelClass}>Description AR</span>
                  <textarea
                    className={cn(inputClass, "min-h-28 resize-y")}
                    dir="rtl"
                    value={form.description_ar}
                    onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
                  />
                  {formErrors.description_ar ? (
                    <p className="text-xs font-medium text-red-600">{formErrors.description_ar}</p>
                  ) : null}
                </label>
                <label className={cn("space-y-2 sm:col-span-2", formStep !== 2 && "hidden")}>
                  <span className={labelClass}>المكونات / dietary (مفصولة بفاصلة)</span>
                  <textarea
                    className={cn(inputClass, "min-h-20 resize-y")}
                    value={form.ingredients}
                    onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
                  />
                </label>

                <label className={cn("space-y-2", formStep !== 3 && "hidden")}>
                  <span className={labelClass}>التصنيف</span>
                  <input
                    className={inputClass}
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  />
                </label>
                <label className={cn("space-y-2", formStep !== 3 && "hidden")}>
                  <span className={labelClass}>السعر (ج.م) *</span>
                  <input
                    className={cn(inputClass, formErrors.price_egp && inputErrorClass)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price_egp}
                    onChange={(e) => setForm((f) => ({ ...f, price_egp: e.target.value }))}
                  />
                  {formErrors.price_egp ? (
                    <p className="text-xs font-medium text-red-600">{formErrors.price_egp}</p>
                  ) : null}
                </label>
                <label className={cn("space-y-2", formStep !== 3 && "hidden")}>
                  <span className={labelClass}>سعر مقارنة / خصم</span>
                  <input
                    className={cn(inputClass, formErrors.compare_price_egp && inputErrorClass)}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.compare_price_egp}
                    onChange={(e) => setForm((f) => ({ ...f, compare_price_egp: e.target.value }))}
                  />
                  {formErrors.compare_price_egp ? (
                    <p className="text-xs font-medium text-red-600">{formErrors.compare_price_egp}</p>
                  ) : null}
                </label>
                <label className={cn("space-y-2", formStep !== 3 && "hidden")}>
                  <span className={labelClass}>المخزون</span>
                  <input
                    className={cn(inputClass, formErrors.stock && inputErrorClass)}
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  />
                  {formErrors.stock ? (
                    <p className="text-xs font-medium text-red-600">{formErrors.stock}</p>
                  ) : null}
                </label>
                <label className={cn("space-y-2", formStep !== 3 && "hidden")}>
                  <span className={labelClass}>الوزن (جرام)</span>
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    value={form.weight_grams}
                    onChange={(e) => setForm((f) => ({ ...f, weight_grams: e.target.value }))}
                  />
                </label>
                <label className={cn("space-y-2", formStep !== 3 && "hidden")}>
                  <span className={labelClass}>عدد القطع</span>
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    value={form.pieces_count}
                    onChange={(e) => setForm((f) => ({ ...f, pieces_count: e.target.value }))}
                  />
                </label>
                <label
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-emerald-200/90 bg-emerald-50/80 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-300 sm:col-span-2",
                    formStep !== 3 && "hidden",
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  نشط — يظهر في المتجر للعملاء
                </label>

                <div
                  className={cn(
                    "sm:col-span-2 rounded-2xl border-2 border-dashed border-amber-200/90 bg-gradient-to-br from-white to-amber-50/50 p-4",
                    formStep !== 3 && "hidden",
                  )}
                >
                  <p className="mb-3 flex items-center gap-2 text-xs font-bold text-cb-terracotta-dark">
                    <Images className="h-4 w-4" aria-hidden />
                    الصور والفيديو (حتى ٥ صور)
                  </p>
                  <ProductMediaEditor
                    images={form.images}
                    videoUrl={form.video_url}
                    canWrite={canWrite}
                    onImagesChange={(images) => setForm((f) => ({ ...f, images }))}
                    onVideoUrlChange={(video_url) => setForm((f) => ({ ...f, video_url }))}
                    onLegacyImageUrlChange={(image_url) => setForm((f) => ({ ...f, image_url }))}
                  />
                  {formErrors.images ? <p className="mt-1 text-xs text-red-600">{formErrors.images}</p> : null}
                  {formErrors.video_url ? (
                    <p className="mt-1 text-xs text-red-600">{formErrors.video_url}</p>
                  ) : null}
                </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cb-border/70 bg-white/80 px-5 py-4 shadow-[0_-8px_24px_-12px_rgba(61,40,20,0.15)] backdrop-blur-md">
              <button
                type="button"
                className="text-sm font-semibold text-cb-text-muted transition hover:text-cb-text-strong"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border-2 border-cb-border/80 bg-white px-4 py-2.5 text-sm font-bold text-cb-text-strong shadow-sm transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-40"
                  disabled={formStep === 1}
                  onClick={() => setFormStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                  رجوع
                </button>
                {formStep < 3 ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-amber-500 to-cb-terracotta-dark px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-cb-terracotta-dark/25 transition hover:scale-[1.02] hover:brightness-110 disabled:opacity-40"
                    disabled={!stepDone[formStep]}
                    onClick={() => setFormStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))}
                  >
                    التالي
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving || !canWrite || hasBlockingErrors}
                    className="inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-full bg-gradient-to-l from-cb-terracotta-dark via-[#B45309] to-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-cb-terracotta-dark/35 transition hover:scale-[1.02] hover:brightness-110 disabled:scale-100 disabled:opacity-50"
                    onClick={() => void submitForm()}
                  >
                    {saving ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                    )}
                    {saving ? "جاري الحفظ…" : editing ? "حفظ التعديلات" : "إنشاء المنتج"}
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
