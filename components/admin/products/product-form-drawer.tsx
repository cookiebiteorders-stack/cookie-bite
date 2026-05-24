"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Cookie,
  FileText,
  Home,
  Images,
  Loader2,
  Sparkles,
  Tag,
  Wand2,
  X,
} from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import type { AdminProductRow } from "@/lib/admin/products-dashboard-types";
import {
  EMPTY_PRODUCT_FORM,
  badgesIncludeHomepage,
  formToApiPayload,
  rowToProductForm,
  syncBadgesWithHomepage,
  type ProductFormState,
} from "@/lib/admin/products-dashboard-types";
import { ProductMediaEditor } from "@/components/admin/products/product-media-editor";
import { DEFAULT_PRODUCT_CATEGORIES } from "@/lib/admin/product-categories";
import {
  clearProductFormDraft,
  loadProductFormDraft,
  productFormDraftHasContent,
  saveProductFormDraft,
} from "@/lib/admin/product-form-draft";
import {
  deriveComparePriceFromSalePrice,
  generateProductFieldsFromName,
} from "@/lib/admin/product-auto-fill";
import { CatalogMultiSelect } from "@/components/admin/products/catalog-multi-select";
import {
  PRODUCT_BADGE_OPTIONS,
  PRODUCT_SEASON_OPTIONS,
  filterValidBadges,
  filterValidSeasons,
  joinCatalogCsv,
  labelForBadge,
  labelForSeason,
  parseCatalogCsv,
} from "@/lib/products/catalog-options";
import { useProductsDashboardStore } from "@/stores/products-dashboard-store";
import { cn } from "@/lib/utils";

type FormErrors = Partial<Record<keyof ProductFormState, string>>;

const FORM_STEPS = [
  { id: 1 as const, label: "أساسي", hint: "الاسم والهوية", icon: Tag },
  { id: 2 as const, label: "محتوى", hint: "الوصف والمكونات", icon: FileText },
  { id: 3 as const, label: "وسائط وسعر", hint: "صور، سعر، مخزون", icon: Images },
] as const;

const inputClass =
  "w-full rounded-xl border border-cb-border/70 bg-white px-3 py-2 text-sm font-medium text-cb-text-strong shadow-sm transition-all duration-200 placeholder:text-cb-text-muted/55 focus:border-cb-terracotta-dark focus:outline-none focus:ring-2 focus:ring-cb-terracotta-dark/20 dark:bg-cb-surface dark:text-cb-text-strong";

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

  const editingId = editing?.id ?? null;
  const hasUnsavedDraft = !editingId && productFormDraftHasContent(form);
  const draftToastShown = useRef(false);
  const lastAutoNameRef = useRef("");
  const [comparePriceManual, setComparePriceManual] = useState(false);
  const autoFillAbortRef = useRef<AbortController | null>(null);
  const aiAssistAbortRef = useRef<AbortController | null>(null);
  const [autoFillBusy, setAutoFillBusy] = useState(false);
  const [aiCopyBusy, setAiCopyBusy] = useState(false);
  const [aiImageBusy, setAiImageBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingId && editing) {
      setForm(rowToProductForm(editing));
      setFormStep(1);
      lastAutoNameRef.current = editing.name.trim();
      const sale = Number(editing.price_egp);
      const compare = Number(editing.compare_price_egp);
      setComparePriceManual(
        Number.isFinite(compare) &&
          compare > 0 &&
          Number.isFinite(sale) &&
          sale > 0 &&
          compare > sale,
      );
      return;
    }
    const draft = loadProductFormDraft();
    if (draft && productFormDraftHasContent(draft.form)) {
      setForm(draft.form);
      setFormStep(draft.formStep);
      lastAutoNameRef.current = draft.form.name.trim();
      const sale = Number(draft.form.price_egp);
      const compare = Number(draft.form.compare_price_egp);
      setComparePriceManual(
        draft.form.compare_price_egp.trim().length > 0 &&
          Number.isFinite(compare) &&
          compare > 0 &&
          Number.isFinite(sale) &&
          sale > 0 &&
          compare > sale,
      );
      if (!draftToastShown.current) {
        draftToastShown.current = true;
        pushToast("تم استعادة مسودة المنتج من آخر جلسة.", "info");
      }
    } else {
      setForm(EMPTY_PRODUCT_FORM);
      setFormStep(1);
      lastAutoNameRef.current = "";
      setComparePriceManual(false);
    }
  }, [open, editingId, editing, pushToast]);

  const handlePriceChange = useCallback(
    (value: string) => {
      setForm((f) => {
        const next: ProductFormState = { ...f, price_egp: value };
        if (!comparePriceManual) {
          const price = Number(value);
          if (Number.isFinite(price) && price > 0) {
            next.compare_price_egp = deriveComparePriceFromSalePrice(price);
          }
        }
        return next;
      });
    },
    [comparePriceManual],
  );

  const handleComparePriceChange = useCallback((value: string) => {
    setComparePriceManual(value.trim().length > 0);
    setForm((f) => ({ ...f, compare_price_egp: value }));
  }, []);

  useEffect(() => {
    if (!open || editingId) return;
    const timer = window.setTimeout(() => saveProductFormDraft(form, formStep), 400);
    return () => window.clearTimeout(timer);
  }, [form, formStep, open, editingId]);

  const discardDraft = useCallback(() => {
    clearProductFormDraft();
    draftToastShown.current = false;
    lastAutoNameRef.current = "";
    setComparePriceManual(false);
    setForm(EMPTY_PRODUCT_FORM);
    setFormStep(1);
    pushToast("تم مسح المسودة.", "success");
  }, [pushToast]);

  const applyAutoFromName = useCallback(
    (name: string, options?: { silent?: boolean; keepMedia?: boolean; ai?: boolean }) => {
      const trimmed = name.trim();
      if (trimmed.length < 2) return;

      const generated = generateProductFieldsFromName(trimmed);
      lastAutoNameRef.current = trimmed;
      setComparePriceManual(false);
      setForm((f) => ({
        ...f,
        ...generated,
        name: trimmed,
        ...(options?.keepMedia !== false
          ? {
              images: f.images,
              video_url: f.video_url,
              image_url: f.image_url,
            }
          : {}),
      }));

      if (options?.ai === false) {
        if (!options?.silent) {
          pushToast("تم توليد الحقول من اسم المنتج.", "success");
        }
        return;
      }

      autoFillAbortRef.current?.abort();
      const ac = new AbortController();
      autoFillAbortRef.current = ac;
      setAutoFillBusy(true);

      void fetchJson<{
        fields: Partial<ProductFormState>;
        source: "local" | "ai";
      }>("/api/admin/products/auto-fill", {
        method: "POST",
        jsonBody: { name: trimmed },
        signal: ac.signal,
      })
        .then((res) => {
          if (ac.signal.aborted) return;
          setForm((f) => ({
            ...f,
            ...res.fields,
            name: trimmed,
            ...(options?.keepMedia !== false
              ? {
                  images: f.images,
                  video_url: f.video_url,
                  image_url: f.image_url,
                }
              : {}),
          }));
          if (!options?.silent) {
            pushToast(
              res.source === "ai"
                ? "تم تحليل الاسم بالذكاء الاصطناعي وتعبئة الحقول."
                : "تم توليد الحقول من اسم المنتج.",
              "success",
            );
          }
        })
        .catch((e) => {
          if (ac.signal.aborted) return;
          if (!options?.silent) {
            const msg = e instanceof Error ? e.message : "تعذّر التحليل بالذكاء الاصطناعي";
            pushToast(msg, "error");
          }
        })
        .finally(() => {
          if (!ac.signal.aborted) setAutoFillBusy(false);
        });
    },
    [pushToast],
  );

  useEffect(() => {
    if (!open || editingId) return;
    const trimmed = form.name.trim();
    if (trimmed.length < 2) return;
    if (trimmed === lastAutoNameRef.current) return;

    const timer = window.setTimeout(() => {
      applyAutoFromName(trimmed, { silent: true, keepMedia: true });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [form.name, open, editingId, applyAutoFromName]);

  useEffect(() => {
    if (!open) {
      autoFillAbortRef.current?.abort();
      aiAssistAbortRef.current?.abort();
      setAutoFillBusy(false);
      setAiCopyBusy(false);
      setAiImageBusy(false);
    }
  }, [open]);

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
    const isValidMediaUrl = (u: string) => {
      const t = u.trim();
      if (!t) return true;
      if (t.startsWith("/")) return true;
      try {
        const parsed = new URL(t);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    };
    for (const img of form.images) {
      const u = img.url.trim();
      if (u && !isValidMediaUrl(u)) {
        errors.images = "أحد روابط الصور غير صالح.";
        break;
      }
    }
    const video = form.video_url.trim();
    if (video && !isValidMediaUrl(video)) errors.video_url = "رابط الفيديو غير صالح.";
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
      2: !formErrors.description_en && !formErrors.description_ar,
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

  const regenerateFromName = useCallback(() => {
    if (form.name.trim().length < 2) {
      pushToast("اكتب اسم المنتج أولاً (حرفان على الأقل).", "info");
      return;
    }
    applyAutoFromName(form.name, { silent: false, keepMedia: true });
  }, [form.name, applyAutoFromName, pushToast]);

  const improveCopyWithAi = useCallback(() => {
    const hasText =
      form.name.trim().length >= 2 ||
      form.title_en.trim() ||
      form.title_ar.trim() ||
      form.description_en.trim() ||
      form.description_ar.trim() ||
      form.ingredients.trim();

    if (!hasText) {
      pushToast("اكتب نصاً في الاسم أو الوصف أو المكونات أولاً.", "info");
      return;
    }

    aiAssistAbortRef.current?.abort();
    const ac = new AbortController();
    aiAssistAbortRef.current = ac;
    setAiCopyBusy(true);

    void fetchJson<{
      fields: Partial<ProductFormState>;
      source: "ai" | "none";
    }>("/api/admin/products/ai-assist", {
      method: "POST",
      jsonBody: {
        action: "improve",
        name: form.name,
        title_en: form.title_en,
        title_ar: form.title_ar,
        description_en: form.description_en,
        description_ar: form.description_ar,
        ingredients: form.ingredients,
      },
      signal: ac.signal,
    })
      .then((res) => {
        if (ac.signal.aborted) return;
        setForm((f) => ({ ...f, ...res.fields }));
        pushToast(
          res.source === "ai"
            ? "تم تحسين الصياغة — نفس المعنى بأسلوب أوضح."
            : "لا يوجد نص لتحسينه.",
          res.source === "ai" ? "success" : "info",
        );
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        const msg = e instanceof Error ? e.message : "تعذّر تحسين النص";
        pushToast(msg, "error");
      })
      .finally(() => {
        if (!ac.signal.aborted) setAiCopyBusy(false);
      });
  }, [form, pushToast]);

  const generateProductImageWithAi = useCallback(() => {
    if (form.name.trim().length < 2) {
      pushToast("اكتب اسم المنتج أولاً لتوليد صورة مناسبة.", "info");
      return;
    }

    aiAssistAbortRef.current?.abort();
    const ac = new AbortController();
    aiAssistAbortRef.current = ac;
    setAiImageBusy(true);

    void fetchJson<{
      image: { url: string; source: string; alt_en: string; alt_ar: string };
    }>("/api/admin/products/ai-assist", {
      method: "POST",
      jsonBody: {
        action: "image",
        name: form.name.trim(),
        title_en: form.title_en.trim() || undefined,
        description_en: form.description_en.trim() || undefined,
        description_ar: form.description_ar.trim() || undefined,
        category: form.category.trim() || undefined,
      },
      signal: ac.signal,
    })
      .then((res) => {
        if (ac.signal.aborted) return;
        const { url, alt_en, alt_ar, source } = res.image;
        setForm((f) => {
          const images = [...f.images];
          const emptyIdx = images.findIndex((img) => !img.url.trim());
          const slot = emptyIdx >= 0 ? emptyIdx : 0;
          while (images.length <= slot) {
            images.push({ url: "", alt_en: "", alt_ar: "" });
          }
          images[slot] = { url, alt_en, alt_ar };
          return {
            ...f,
            images,
            image_url: slot === 0 || !f.image_url.trim() ? url : f.image_url,
          };
        });
        const sourceLabel =
          source === "generated"
            ? "توليد بالذكاء الاصطناعي"
            : source === "unsplash"
              ? "بحث Unsplash"
              : source === "stock"
                ? "مكتبة صور الكوكيز"
                : "رابط خارجي";
        pushToast(`تمت إضافة صورة المنتج (${sourceLabel}).`, "success");
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        const msg = e instanceof Error ? e.message : "تعذّر توليد الصورة";
        pushToast(msg, "error");
      })
      .finally(() => {
        if (!ac.signal.aborted) setAiImageBusy(false);
      });
  }, [form, pushToast]);

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
      const homepageNote =
        form.show_on_homepage && form.is_active
          ? " سيظهر في الصفحة الرئيسية."
          : form.show_on_homepage && !form.is_active
            ? " مُعلَّم للرئيسية — فعِّل «نشط» ليظهر للعملاء."
            : "";
      pushToast(
        (editing ? "تم تحديث المنتج — يمكنك تعديله مجدداً من الجدول." : "تم إنشاء المنتج.") +
          homepageNote,
        "success",
      );
      clearProductFormDraft();
      draftToastShown.current = false;
      lastAutoNameRef.current = "";
      setForm(EMPTY_PRODUCT_FORM);
      setFormStep(1);
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
            className="admin-product-drawer-light flex h-full w-full max-w-2xl flex-col overflow-hidden border-s border-cb-border/80 bg-gradient-to-b from-[#FFFBF5] via-[#FFFBF5] to-[#F8EDE0] shadow-[-16px_0_40px_-10px_rgba(61,40,20,0.35)] dark:from-[#FFFBF5] dark:via-[#FFFBF5] dark:to-[#F8EDE0]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* منطقة تمرير واحدة: رأس مضغوط + خطوات + نموذج */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <header className="flex items-center gap-2.5 border-b border-cb-border/40 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cb-terracotta-dark to-amber-600 text-white shadow-sm">
                  {editing ? (
                    <Tag className="h-4 w-4" aria-hidden />
                  ) : (
                    <Cookie className="h-4 w-4" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    id="product-form-title"
                    className="truncate font-serif text-lg font-bold leading-tight text-cb-text-strong"
                  >
                    {editing ? "تعديل منتج" : "إضافة منتج"}
                  </h2>
                  <p className="truncate text-[10px] text-cb-text-muted">
                    الخطوة {formStep} من ٣
                    {!editingId ? " · مسودة تلقائية" : ""}
                    {hasUnsavedDraft ? (
                      <span className="ms-1 font-bold text-amber-800">· محفوظة</span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-xl border border-cb-border/70 bg-white/80 p-2 text-cb-text-muted transition hover:bg-white hover:text-cb-text-strong"
                  onClick={() => onOpenChange(false)}
                  aria-label="إغلاق"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="border-b border-cb-border/40 px-4 py-2.5">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold text-cb-text-muted">
                  <span>الخطوة {formStep} من ٣</span>
                  <span className="tabular-nums text-cb-terracotta-dark">
                    {Math.round((formStep / 3) * 100)}%
                  </span>
                </div>
                <div className="mb-2 h-1 overflow-hidden rounded-full bg-cb-border/40">
                  <motion.div
                    className="h-full rounded-full bg-cb-terracotta-dark"
                    initial={false}
                    animate={{ width: `${(formStep / 3) * 100}%` }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                </div>
                <div className="flex gap-1" role="tablist" aria-label="خطوات النموذج">
                  {FORM_STEPS.map((s) => {
                    const active = formStep === s.id;
                    const done = stepDone[s.id];
                    const enabled = canEnterStep[s.id];
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        disabled={!enabled}
                        onClick={() => {
                          if (!enabled) return;
                          setFormStep(s.id);
                        }}
                        className={cn(
                          "flex min-h-8 flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition",
                          active
                            ? "bg-cb-terracotta-dark text-white shadow-sm"
                            : done
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
                              : enabled
                                ? "bg-white text-cb-text-strong ring-1 ring-cb-border/60 hover:bg-amber-50"
                                : "cursor-not-allowed bg-cb-surface/30 text-cb-text-muted/50",
                        )}
                      >
                        {done && !active ? (
                          <Check className="h-3 w-3 shrink-0" strokeWidth={3} aria-hidden />
                        ) : (
                          <span className="tabular-nums text-[10px] opacity-80">{s.id}</span>
                        )}
                        <span className="truncate">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-4 py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={formStep}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className={cn(
                    "gap-4",
                    formStep === 3 ? "grid sm:grid-cols-2" : "flex flex-col",
                  )}
                >
                <label className={cn("space-y-2", formStep !== 1 && "hidden")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={labelClass}>اسم المنتج *</span>
                    <motion.div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={aiCopyBusy || autoFillBusy || !canWrite}
                        onClick={improveCopyWithAi}
                        className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold text-violet-900 transition hover:bg-violet-200 disabled:opacity-50"
                      >
                        {aiCopyBusy ? (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        ) : (
                          <Wand2 className="h-3 w-3" aria-hidden />
                        )}
                        تحسين الصياغة
                      </button>
                      <button
                        type="button"
                        disabled={autoFillBusy || !canWrite}
                        onClick={regenerateFromName}
                        className="inline-flex items-center gap-1 rounded-full bg-cb-terracotta-dark/10 px-2.5 py-0.5 text-[10px] font-bold text-cb-terracotta-dark transition hover:bg-cb-terracotta-dark/15 disabled:opacity-50"
                      >
                        <Sparkles className="h-3 w-3" aria-hidden />
                        توليد الكل من الاسم
                      </button>
                    </motion.div>
                  </div>
                  <input
                    className={cn(inputClass, formErrors.name && inputErrorClass)}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="مثال: كوكيز الشوكولاتة الفاخرة"
                  />
                  <p className="text-[10px] text-cb-text-muted">
                    {autoFillBusy
                      ? "جاري تحليل الاسم وتعبئة الحقول…"
                      : "يُملأ فوراً: Slug، عناوين EN/AR منفصلة، وصف، تصنيف، سعر، SKU…"}
                  </p>
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
                  ) : (
                    <p className="text-[11px] text-cb-text-muted">
                      رابط المتجر: /shop/{form.slug.trim() || "—"}
                    </p>
                  )}
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
                <div className={cn(formStep !== 1 && "hidden")}>
                  <CatalogMultiSelect
                    label="الشارات"
                    hint="كما في المتجر: الأكثر مبيعًا، جديد، رائج، مميز"
                    options={PRODUCT_BADGE_OPTIONS}
                    valueCsv={form.badges}
                    onChangeCsv={(badges) =>
                      setForm((f) => ({
                        ...f,
                        badges,
                        show_on_homepage: badgesIncludeHomepage(badges),
                      }))
                    }
                    parse={(csv) => filterValidBadges(parseCatalogCsv(csv))}
                    join={joinCatalogCsv}
                    labelFor={labelForBadge}
                    disabled={!canWrite}
                  />
                </div>
                <div className={cn(formStep !== 1 && "hidden")}>
                  <CatalogMultiSelect
                    label="المواسم"
                    hint="مناسبات وتصفية موسمية في الموقع"
                    options={PRODUCT_SEASON_OPTIONS}
                    valueCsv={form.seasons}
                    onChangeCsv={(seasons) => setForm((f) => ({ ...f, seasons }))}
                    parse={(csv) => filterValidSeasons(parseCatalogCsv(csv))}
                    join={joinCatalogCsv}
                    labelFor={labelForSeason}
                    disabled={!canWrite}
                  />
                </div>

                <div className={cn("space-y-3", formStep !== 1 && "hidden")}>
                  <span className={labelClass}>التصنيف</span>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_PRODUCT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, category: cat.value }))}
                        className={cn(
                          "rounded-full border-2 px-3 py-1.5 text-xs font-bold transition",
                          form.category === cat.value
                            ? "border-cb-terracotta-dark bg-cb-terracotta-dark text-white shadow-sm"
                            : "border-cb-border/80 bg-white text-cb-text-strong hover:border-amber-300 hover:bg-amber-50",
                        )}
                      >
                        {cat.labelAr}
                      </button>
                    ))}
                  </div>
                  <input
                    className={inputClass}
                    list="product-category-custom"
                    placeholder="أو اكتب تصنيفاً مخصصاً"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  />
                  <datalist id="product-category-custom">
                    {DEFAULT_PRODUCT_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value} />
                    ))}
                  </datalist>
                </div>

                <div className={cn("flex flex-wrap items-center justify-between gap-2", formStep !== 2 && "hidden")}>
                  <p className={labelClass}>الوصف والمكونات</p>
                  <button
                    type="button"
                    disabled={aiCopyBusy || !canWrite}
                    onClick={improveCopyWithAi}
                    className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold text-violet-900 transition hover:bg-violet-200 disabled:opacity-50"
                  >
                    {aiCopyBusy ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    ) : (
                      <Wand2 className="h-3 w-3" aria-hidden />
                    )}
                    تحسين الصياغة (بدون تغيير المعنى)
                  </button>
                </div>
                <label className={cn("space-y-2", formStep !== 2 && "hidden")}>
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
                <label className={cn("space-y-2", formStep !== 2 && "hidden")}>
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
                <label className={cn("space-y-2", formStep !== 2 && "hidden")}>
                  <span className={labelClass}>المكونات / dietary (مفصولة بفاصلة)</span>
                  <textarea
                    className={cn(inputClass, "min-h-20 resize-y")}
                    value={form.ingredients}
                    onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
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
                    onChange={(e) => handlePriceChange(e.target.value)}
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
                    onChange={(e) => handleComparePriceChange(e.target.value)}
                  />
                  {!comparePriceManual && form.price_egp.trim() ? (
                    <p className="text-xs text-cb-text-muted">
                      يُحدَّث تلقائياً (~12% أعلى من السعر)
                    </p>
                  ) : null}
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
                <div
                  className={cn(
                    "flex flex-col gap-2 sm:col-span-2",
                    formStep !== 3 && "hidden",
                  )}
                >
                  <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-emerald-200/90 bg-emerald-50/80 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-300">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    />
                    نشط — يظهر في المتجر للعملاء
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-amber-200/90 bg-amber-50/80 px-4 py-3 text-sm font-semibold text-amber-950 shadow-sm transition hover:border-amber-300">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      checked={form.show_on_homepage}
                      onChange={(e) => {
                        const show_on_homepage = e.target.checked;
                        setForm((f) => ({
                          ...f,
                          show_on_homepage,
                          badges: syncBadgesWithHomepage(f.badges, show_on_homepage),
                        }));
                      }}
                    />
                    <Home className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                    <span>
                      عرض في الصفحة الرئيسية
                      <span className="mt-0.5 block text-[10px] font-medium text-amber-800/90">
                        يُضاف تلقائياً شارة «مميز» ويظهر في كاروسيل الأكثر مبيعاً
                      </span>
                    </span>
                  </label>
                </div>

                <div
                  className={cn(
                    "col-span-full rounded-2xl border border-amber-200/70 bg-gradient-to-br from-white to-amber-50/40 p-4 sm:col-span-2",
                    formStep !== 3 && "hidden",
                  )}
                >
                  <motion.div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-xs font-bold text-cb-terracotta-dark">
                      <Images className="h-4 w-4" aria-hidden />
                      الصور والفيديو (حتى ٥ صور)
                    </p>
                    <button
                      type="button"
                      disabled={aiImageBusy || !canWrite}
                      onClick={generateProductImageWithAi}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-violet-600 to-cb-terracotta-dark px-3 py-1.5 text-[10px] font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                    >
                      {aiImageBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      )}
                      توليد / بحث صورة بالذكاء الاصطناعي
                    </button>
                  </motion.div>
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
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-cb-border/70 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_-8px_rgba(61,40,20,0.12)] dark:bg-cb-surface-elevated">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="text-sm font-semibold text-cb-text-muted transition hover:text-cb-text-strong"
                  onClick={() => onOpenChange(false)}
                >
                  {editingId ? "إلغاء" : "إغلاق"}
                </button>
                {!editingId && hasUnsavedDraft ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 hover:underline"
                    onClick={discardDraft}
                  >
                    مسح المسودة
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-cb-border/80 bg-white px-3 py-2 text-sm font-bold text-cb-text-strong shadow-sm transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-40"
                  disabled={formStep === 1}
                  onClick={() => setFormStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                  رجوع
                </button>
                {formStep < 3 ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-amber-500 to-cb-terracotta-dark px-4 py-2 text-sm font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-40"
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
                    className="inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-full bg-gradient-to-l from-cb-terracotta-dark to-amber-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
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
