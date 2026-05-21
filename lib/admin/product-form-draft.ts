import type { ProductFormState } from "@/lib/admin/products-dashboard-types";
import { EMPTY_PRODUCT_FORM, EMPTY_PRODUCT_IMAGE_SLOT } from "@/lib/admin/products-dashboard-types";

const STORAGE_KEY = "cookie-bite-admin-product-draft-v1";

export type ProductFormDraft = {
  form: ProductFormState;
  formStep: 1 | 2 | 3;
  savedAt: number;
};

function isFormStep(n: unknown): n is 1 | 2 | 3 {
  return n === 1 || n === 2 || n === 3;
}

function reviveForm(raw: ProductFormState): ProductFormState {
  const images =
    Array.isArray(raw.images) && raw.images.length > 0
      ? raw.images.map((img) => ({
          url: String(img?.url ?? ""),
          alt_en: String(img?.alt_en ?? ""),
          alt_ar: String(img?.alt_ar ?? ""),
        }))
      : [{ ...EMPTY_PRODUCT_IMAGE_SLOT }];
  return {
    ...EMPTY_PRODUCT_FORM,
    ...raw,
    images,
    is_active: raw.is_active !== false,
  };
}

export function loadProductFormDraft(): ProductFormDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProductFormDraft;
    if (!parsed?.form || !isFormStep(parsed.formStep)) return null;
    return {
      form: reviveForm(parsed.form),
      formStep: parsed.formStep,
      savedAt: Number(parsed.savedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveProductFormDraft(form: ProductFormState, formStep: 1 | 2 | 3): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ProductFormDraft = { form, formStep, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearProductFormDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** هل المسودة تحتوي بيانات يدوية (غير النموذج الفارغ) */
export function productFormDraftHasContent(form: ProductFormState): boolean {
  if (form.name.trim().length >= 2) return true;
  if (form.slug.trim()) return true;
  if (form.description_en.trim() || form.description_ar.trim()) return true;
  if (form.price_egp.trim() && Number(form.price_egp) > 0) return true;
  if (form.images.some((i) => i.url.trim())) return true;
  if (form.video_url.trim()) return true;
  if (form.sku.trim()) return true;
  return false;
}
