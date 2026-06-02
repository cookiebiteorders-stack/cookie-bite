"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AdminBilingualLabel,
  AdminBilingualSection,
} from "@/components/admin/admin-bilingual-label";
import { fetchJson } from "@/lib/http/fetch-json";
import { buildAddonSubmitPayload, validateAddonForm } from "@/lib/addons/submit-payload";
import type { Addon } from "@/lib/addons/types";

const L = {
  pageTitle: { en: "Product Add-ons", ar: "إضافات المنتج" },
  aiSection: { en: "AI Add-on Builder", ar: "منشئ الإضافات بالذكاء الاصطناعي" },
  aiPrompt: {
    en: "Describe the add-on you want…",
    ar: "صف الإضافة التي تريد إنشاءها…",
  },
  aiExample: {
    en: "Example: optional gift wrapping with 3 tiers and realistic EGP prices",
    ar: "مثال: تغليف هدايا اختياري بثلاث فئات وأسعار جنيه واقعية",
  },
  generateAi: { en: "Generate with AI", ar: "إنشاء بالذكاء الاصطناعي" },
  generating: { en: "Generating…", ar: "جاري الإنشاء…" },
  detailsSection: { en: "Add-on details", ar: "تفاصيل الإضافة" },
  name: { en: "Name", ar: "الاسم" },
  namePh: { en: "e.g. Gift wrapping", ar: "مثال: تغليف هدايا" },
  description: { en: "Description", ar: "الوصف" },
  descriptionPh: { en: "Short customer-facing description", ar: "وصف قصير يظهر للعميل" },
  type: { en: "Selection type", ar: "نوع الاختيار" },
  typeSingle: { en: "Single choice", ar: "اختيار واحد" },
  typeMultiple: { en: "Multiple choice", ar: "اختيارات متعددة" },
  required: { en: "Required add-on", ar: "إضافة إلزامية" },
  defaultPrice: { en: "Default option price (EGP)", ar: "السعر الافتراضي للخيار (جنيه)" },
  defaultPricePh: { en: "0.00", ar: "0.00" },
  productSection: { en: "Link to product", ar: "الربط بمنتج" },
  searchProduct: { en: "Search product by name", ar: "بحث عن منتج بالاسم" },
  searchProductPh: { en: "Type product name…", ar: "اكتب اسم المنتج…" },
  selectProduct: { en: "Select product", ar: "اختر المنتج" },
  selectProductPh: { en: "Select product to link (optional)", ar: "اختر منتجاً للربط (اختياري)" },
  productCount: { en: "products shown", ar: "منتج معروض" },
  selectedProduct: { en: "Selected product", ar: "المنتج المحدد" },
  applyDefaultPrice: { en: "Apply default price to all options", ar: "تطبيق السعر الافتراضي على كل الخيارات" },
  optionsSection: { en: "Options", ar: "الخيارات" },
  optionName: { en: "Option name", ar: "اسم الخيار" },
  optionNamePh: { en: "e.g. Standard wrap", ar: "مثال: تغليف عادي" },
  size: { en: "Size", ar: "المقاس" },
  sizePh: { en: "e.g. Small, Medium, Large", ar: "مثال: صغير، وسط، كبير" },
  price: { en: "Price (EGP)", ar: "السعر (جنيه)" },
  pricePh: { en: "0.00", ar: "0.00" },
  quantityLimit: { en: "Quantity limit", ar: "حد الكمية" },
  quantityLimitPh: { en: "Leave empty for unlimited", ar: "اتركه فارغاً لعدم التحديد" },
  defaultSelected: { en: "Default selected", ar: "محدد افتراضياً" },
  removeOption: { en: "Remove", ar: "حذف" },
  addOption: { en: "Add option", ar: "إضافة خيار" },
  createAddon: { en: "Create Add-on", ar: "إنشاء إضافة" },
  updateAddon: { en: "Update Add-on", ar: "تحديث الإضافة" },
  createAndLink: { en: "Create & Link to Product", ar: "إنشاء وربط بالمنتج" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  listSection: { en: "Saved add-ons", ar: "الإضافات المحفوظة" },
  linked: { en: "Linked", ar: "مربوط" },
  notLinked: { en: "Not linked", ar: "غير مربوط" },
  requiredBadge: { en: "Required", ar: "إلزامي" },
  optionalBadge: { en: "Optional", ar: "اختياري" },
  priceRange: { en: "Price", ar: "السعر" },
  edit: { en: "Edit", ar: "تعديل" },
  link: { en: "Link to selected product", ar: "ربط بالمنتج المحدد" },
  unlink: { en: "Unlink from selected product", ar: "إلغاء الربط من المنتج" },
  delete: { en: "Delete", ar: "حذف" },
} as const;

const emptyOption = {
  id: "",
  name: "",
  size: "",
  price: 0,
  quantity_limit: null as number | null,
  default_selected: false,
};

const emptyAddon: Addon = {
  id: "",
  name: "",
  description: "",
  type: "single_choice",
  required: false,
  options: [{ ...emptyOption }],
};

function Field({
  label,
  children,
}: {
  label: { en: string; ar: string };
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <AdminBilingualLabel en={label.en} ar={label.ar} />
      {children}
    </div>
  );
}

export default function AdminAddonsPage() {
  type ProductLite = {
    id: string;
    name?: string | null;
    title_en?: string | null;
    title_ar?: string | null;
    linked_addon_ids?: string[];
  };
  const [addons, setAddons] = useState<Addon[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [form, setForm] = useState<Addon>(emptyAddon);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [defaultPrice, setDefaultPrice] = useState<number>(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetchJson<{ addons: Addon[] }>("/api/admin/addons", { cache: "no-store" });
    setAddons(res.addons ?? []);
  }

  async function loadProducts() {
    const all: ProductLite[] = [];
    const limit = 100;
    let page = 1;
    let total = 0;
    do {
      const res = await fetchJson<{ products: ProductLite[]; total: number }>(
        `/api/admin/products?page=${page}&limit=${limit}`,
        { cache: "no-store" },
      );
      all.push(...(res.products ?? []));
      total = res.total ?? all.length;
      if ((res.products?.length ?? 0) < limit) break;
      page += 1;
    } while (all.length < total && page <= 50);
    setProducts(all);
  }

  useEffect(() => {
    void load();
    void loadProducts();
  }, []);

  const productOptions = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const sorted = [...products].sort((a, b) =>
      (a.title_en ?? a.name ?? a.id).localeCompare(b.title_en ?? b.name ?? b.id, undefined, {
        sensitivity: "base",
      }),
    );
    if (!q) return sorted;
    return sorted.filter((p) => {
      const title = (p.title_en ?? p.name ?? "").toLowerCase();
      const ar = p.title_ar?.toLowerCase() ?? "";
      return title.includes(q) || ar.includes(q) || p.id.toLowerCase().includes(q);
    });
  }, [products, productSearch]);

  const selectedProductName = useMemo(() => {
    const row = products.find((p) => p.id === selectedProductId);
    return row ? row.title_en ?? row.name ?? row.id : "";
  }, [products, selectedProductId]);
  const selectedProductLinkedAddonIds = useMemo(() => {
    const row = products.find((p) => p.id === selectedProductId);
    return new Set(Array.isArray(row?.linked_addon_ids) ? row!.linked_addon_ids : []);
  }, [products, selectedProductId]);

  async function save() {
    const validationError = validateAddonForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    const payload = buildAddonSubmitPayload(form, editingId);
    try {
      if (editingId) {
        await fetchJson("/api/admin/addons", { method: "PATCH", jsonBody: payload });
      } else {
        await fetchJson("/api/admin/addons", { method: "POST", jsonBody: payload });
      }
      setForm(emptyAddon);
      setDefaultPrice(0);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save add-on");
    } finally {
      setSaving(false);
    }
  }

  async function linkAddonToProduct(addonId: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    const existing = Array.isArray(product?.linked_addon_ids) ? product!.linked_addon_ids! : [];
    const merged = Array.from(new Set([...existing, addonId]));
    await fetchJson("/api/admin/products", {
      method: "PATCH",
      jsonBody: { ids: [productId], patch: { linked_addon_ids: merged } },
    });
  }

  async function unlinkAddonFromProduct(addonId: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    const existing = Array.isArray(product?.linked_addon_ids) ? product!.linked_addon_ids! : [];
    const next = existing.filter((id) => id !== addonId);
    await fetchJson("/api/admin/products", {
      method: "PATCH",
      jsonBody: { ids: [productId], patch: { linked_addon_ids: next } },
    });
  }

  async function createAndLinkToProduct() {
    if (!selectedProductId) {
      setError("Please select a product first. / الرجاء اختيار منتج أولاً.");
      return;
    }
    const validationError = validateAddonForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = buildAddonSubmitPayload(form, null);
      const res = await fetchJson<{ addon: Addon }>("/api/admin/addons", {
        method: "POST",
        jsonBody: payload,
      });
      if (!res.addon?.id) {
        throw new Error("Add-on was created without a valid id.");
      }
      await linkAddonToProduct(res.addon.id, selectedProductId);
      setForm(emptyAddon);
      setDefaultPrice(0);
      setEditingId(null);
      await Promise.all([load(), loadProducts()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create and link add-on");
    } finally {
      setSaving(false);
    }
  }

  async function generateWithAi() {
    const prompt = aiPrompt.trim();
    if (!prompt || aiBusy) return;
    setError(null);
    setAiBusy(true);
    try {
      const res = await fetchJson<{
        draft: {
          name: string;
          description?: string;
          type: Addon["type"];
          required: boolean;
          options: Array<{
            name: string;
            size?: string | null;
            price: number;
            quantity_limit?: number | null;
            default_selected: boolean;
          }>;
        };
      }>("/api/admin/addons/ai-assist", { method: "POST", jsonBody: { prompt } });
      const next: Addon = {
        id: "",
        name: res.draft.name,
        description: res.draft.description ?? "",
        type: res.draft.type,
        required: Boolean(res.draft.required),
        options: res.draft.options.map((option) => ({
          id: crypto.randomUUID(),
          name: option.name,
          size: option.size ?? "",
          price: Number(option.price) || 0,
          quantity_limit: option.quantity_limit ?? null,
          default_selected: Boolean(option.default_selected),
        })),
      };
      setForm(next);
      setEditingId(null);
      setDefaultPrice(Number(next.options[0]?.price ?? 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate add-on");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-cb-text-strong">{L.pageTitle.en}</h1>
        <p className="text-sm font-medium text-cb-text-muted">{L.pageTitle.ar}</p>
      </div>

      <div className="rounded-xl border border-cb-border bg-cb-surface p-4">
        <div className="mb-4 rounded-xl border border-cb-border bg-cb-surface-2 p-3">
          <AdminBilingualSection en={L.aiSection.en} ar={L.aiSection.ar} className="mb-3" />
          <Field label={L.aiPrompt}>
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                className="min-w-0 flex-1 rounded-lg border border-cb-border px-3 py-2"
                placeholder={`${L.aiExample.en} / ${L.aiExample.ar}`}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                aria-label={`${L.aiPrompt.en} / ${L.aiPrompt.ar}`}
              />
              <button
                type="button"
                className="rounded bg-cb-terracotta-dark px-4 py-2 text-white disabled:opacity-50"
                disabled={aiBusy || !aiPrompt.trim()}
                onClick={() => void generateWithAi()}
              >
                <span className="block text-sm font-semibold">{aiBusy ? L.generating.en : L.generateAi.en}</span>
                <span className="block text-[11px] opacity-90">{aiBusy ? L.generating.ar : L.generateAi.ar}</span>
              </button>
            </div>
          </Field>
        </div>

        <AdminBilingualSection en={L.detailsSection.en} ar={L.detailsSection.ar} className="mb-3" />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={L.name}>
            <input
              className="w-full rounded-lg border border-cb-border px-3 py-2"
              placeholder={`${L.namePh.en} / ${L.namePh.ar}`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label={L.description}>
            <input
              className="w-full rounded-lg border border-cb-border px-3 py-2"
              placeholder={`${L.descriptionPh.en} / ${L.descriptionPh.ar}`}
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <Field label={L.type}>
            <select
              className="w-full rounded-lg border border-cb-border px-3 py-2"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Addon["type"] }))}
            >
              <option value="single_choice">{L.typeSingle.en} / {L.typeSingle.ar}</option>
              <option value="multiple_choice">{L.typeMultiple.en} / {L.typeMultiple.ar}</option>
            </select>
          </Field>
          <div className="flex items-end gap-2 pb-1">
            <input
              id="addon-required"
              type="checkbox"
              checked={form.required}
              onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
            />
            <AdminBilingualLabel en={L.required.en} ar={L.required.ar} htmlFor="addon-required" />
          </div>
          <Field label={L.defaultPrice}>
            <input
              className="w-full rounded-lg border border-cb-border px-3 py-2"
              type="number"
              min={0}
              step="0.01"
              placeholder={L.defaultPricePh.en}
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(Math.max(0, Number(e.target.value) || 0))}
            />
          </Field>
        </div>

        <AdminBilingualSection en={L.productSection.en} ar={L.productSection.ar} className="mb-3 mt-5" />
        <div className="space-y-3">
          <Field label={L.searchProduct}>
            <input
              className="w-full rounded-lg border border-cb-border px-3 py-2"
              placeholder={`${L.searchProductPh.en} / ${L.searchProductPh.ar}`}
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              list="addon-product-suggestions"
            />
            <datalist id="addon-product-suggestions">
              {productOptions.map((p) => (
                <option key={p.id} value={p.title_en ?? p.name ?? p.id} />
              ))}
            </datalist>
          </Field>
          <Field label={L.selectProduct}>
            <select
              className="w-full rounded-lg border border-cb-border px-3 py-2"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              <option value="">{L.selectProductPh.en} / {L.selectProductPh.ar}</option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title_en ?? p.name ?? p.id}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-cb-text-muted">
              {productOptions.length} {L.productCount.en} / {productOptions.length} {L.productCount.ar}
              {products.length !== productOptions.length
                ? ` (${products.length} ${L.productCount.en} total)`
                : null}
            </p>
          </Field>
        </div>
        {selectedProductName ? (
          <p className="mt-2 text-xs text-cb-text-muted">
            <span className="font-bold text-cb-text-strong">{L.selectedProduct.en}</span>
            {" / "}
            <span className="font-bold text-cb-text-strong">{L.selectedProduct.ar}</span>
            {": "}
            <span className="text-cb-text-strong">{selectedProductName}</span>
          </p>
        ) : null}

        <div className="mt-3">
          <button
            type="button"
            className="rounded border border-cb-border px-3 py-1.5 text-xs"
            onClick={() =>
              setForm((f) => ({
                ...f,
                options: f.options.map((x) => ({ ...x, price: defaultPrice })),
              }))
            }
          >
            <span className="font-semibold">{L.applyDefaultPrice.en}</span>
            <span className="mx-1 text-cb-text-muted">·</span>
            <span className="text-cb-text-muted">{L.applyDefaultPrice.ar}</span>
          </button>
        </div>

        <AdminBilingualSection en={L.optionsSection.en} ar={L.optionsSection.ar} className="mb-3 mt-5" />
        <div className="hidden gap-2 rounded-lg border border-dashed border-cb-border bg-cb-surface-2 p-2 text-[10px] font-bold uppercase tracking-wide text-cb-text-muted md:grid md:grid-cols-6">
          <AdminBilingualLabel en={L.optionName.en} ar={L.optionName.ar} />
          <AdminBilingualLabel en={L.size.en} ar={L.size.ar} />
          <AdminBilingualLabel en={L.price.en} ar={L.price.ar} />
          <AdminBilingualLabel en={L.quantityLimit.en} ar={L.quantityLimit.ar} />
          <AdminBilingualLabel en={L.defaultSelected.en} ar={L.defaultSelected.ar} />
          <AdminBilingualLabel en={L.removeOption.en} ar={L.removeOption.ar} />
        </div>
        <div className="mt-2 space-y-3">
          {form.options.map((op, idx) => (
            <div key={idx} className="grid gap-2 rounded-lg border border-cb-border p-3 md:grid-cols-6">
              <div className="space-y-1 md:contents">
                <div className="md:hidden">
                  <AdminBilingualLabel en={L.optionName.en} ar={L.optionName.ar} />
                </div>
                <input
                  className="rounded border border-cb-border px-2 py-1"
                  placeholder={`${L.optionNamePh.en} / ${L.optionNamePh.ar}`}
                  value={op.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      options: f.options.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                    }))
                  }
                  aria-label={`${L.optionName.en} / ${L.optionName.ar}`}
                />
              </div>
              <div className="space-y-1">
                <div className="md:hidden">
                  <AdminBilingualLabel en={L.size.en} ar={L.size.ar} />
                </div>
                <input
                  className="w-full rounded border border-cb-border px-2 py-1"
                  placeholder={`${L.sizePh.en} / ${L.sizePh.ar}`}
                  value={op.size ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      options: f.options.map((x, i) => (i === idx ? { ...x, size: e.target.value } : x)),
                    }))
                  }
                  aria-label={`${L.size.en} / ${L.size.ar}`}
                />
              </div>
              <div className="space-y-1">
                <div className="md:hidden">
                  <AdminBilingualLabel en={L.price.en} ar={L.price.ar} />
                </div>
                <input
                  className="w-full rounded border border-cb-border px-2 py-1"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={L.pricePh.en}
                  value={op.price}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      options: f.options.map((x, i) => (i === idx ? { ...x, price: Number(e.target.value) } : x)),
                    }))
                  }
                  aria-label={`${L.price.en} / ${L.price.ar}`}
                />
              </div>
              <div className="space-y-1">
                <div className="md:hidden">
                  <AdminBilingualLabel en={L.quantityLimit.en} ar={L.quantityLimit.ar} />
                </div>
                <input
                  className="w-full rounded border border-cb-border px-2 py-1"
                  type="number"
                  placeholder={`${L.quantityLimitPh.en} / ${L.quantityLimitPh.ar}`}
                  value={op.quantity_limit ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      options: f.options.map((x, i) =>
                        i === idx
                          ? { ...x, quantity_limit: e.target.value ? Number(e.target.value) : null }
                          : x,
                      ),
                    }))
                  }
                  aria-label={`${L.quantityLimit.en} / ${L.quantityLimit.ar}`}
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={op.default_selected}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      options: f.options.map((x, i) =>
                        i === idx ? { ...x, default_selected: e.target.checked } : x,
                      ),
                    }))
                  }
                  aria-label={`${L.defaultSelected.en} / ${L.defaultSelected.ar}`}
                />
                <AdminBilingualLabel en={L.defaultSelected.en} ar={L.defaultSelected.ar} className="hidden md:block" />
                <span className="md:hidden font-semibold">{L.defaultSelected.en}</span>
              </label>
              <button
                type="button"
                className="rounded bg-red-100 px-2 py-1 text-xs"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    options: f.options.filter((_, i) => i !== idx),
                  }))
                }
              >
                <span className="font-semibold">{L.removeOption.en}</span>
                <span className="block text-[10px] text-red-800/80">{L.removeOption.ar}</span>
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded bg-cb-peach px-3 py-1 text-sm"
            onClick={() =>
              setForm((f) => ({
                ...f,
                options: [...f.options, { ...emptyOption, price: defaultPrice }],
              }))
            }
          >
            <span className="font-semibold">{L.addOption.en}</span>
            <span className="mx-1">·</span>
            <span>{L.addOption.ar}</span>
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-cb-terracotta-dark px-4 py-2 text-white disabled:opacity-50"
            disabled={saving}
            onClick={() => void save()}
          >
            <span className="block text-sm font-semibold">{editingId ? L.updateAddon.en : L.createAddon.en}</span>
            <span className="block text-[11px] opacity-90">{editingId ? L.updateAddon.ar : L.createAddon.ar}</span>
          </button>
          {!editingId ? (
            <button
              type="button"
              className="rounded border border-cb-border px-4 py-2 disabled:opacity-50"
              disabled={saving || !selectedProductId}
              onClick={() => void createAndLinkToProduct()}
            >
              <span className="block text-sm font-semibold">{L.createAndLink.en}</span>
              <span className="block text-[11px] text-cb-text-muted">{L.createAndLink.ar}</span>
            </button>
          ) : null}
          {editingId ? (
            <button
              type="button"
              className="rounded border border-cb-border px-4 py-2"
              onClick={() => {
                setEditingId(null);
                setForm(emptyAddon);
                setDefaultPrice(0);
              }}
            >
              <span className="block text-sm font-semibold">{L.cancel.en}</span>
              <span className="block text-[11px] text-cb-text-muted">{L.cancel.ar}</span>
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </div>

      <AdminBilingualSection en={L.listSection.en} ar={L.listSection.ar} />
      <div className="space-y-2">
        {addons.map((addon) => (
          <div key={addon.id} className="flex flex-col gap-3 rounded-xl border border-cb-border bg-cb-surface p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{addon.name}</p>
                {selectedProductId ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      selectedProductLinkedAddonIds.has(addon.id)
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {selectedProductLinkedAddonIds.has(addon.id)
                      ? `${L.linked.en} / ${L.linked.ar}`
                      : `${L.notLinked.en} / ${L.notLinked.ar}`}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-cb-text-muted">
                {addon.type} · {addon.required ? `${L.requiredBadge.en} / ${L.requiredBadge.ar}` : `${L.optionalBadge.en} / ${L.optionalBadge.ar}`}
              </p>
              <p className="text-xs text-cb-text-muted">
                {L.priceRange.en} / {L.priceRange.ar}:{" "}
                {addon.options.length
                  ? (() => {
                      const prices = addon.options.map((o) => Number(o.price) || 0);
                      const min = Math.min(...prices);
                      const max = Math.max(...prices);
                      return min === max
                        ? `${min.toFixed(2)} EGP`
                        : `${min.toFixed(2)} - ${max.toFixed(2)} EGP`;
                    })()
                  : "N/A"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded border border-cb-border px-3 py-1 text-xs"
                onClick={() => {
                  setEditingId(addon.id);
                  setForm(addon);
                  setDefaultPrice(Number(addon.options[0]?.price ?? 0));
                }}
              >
                <span className="font-semibold">{L.edit.en}</span>
                <span className="block text-[10px] text-cb-text-muted">{L.edit.ar}</span>
              </button>
              <button
                type="button"
                className="rounded border border-cb-border px-3 py-1 text-xs disabled:opacity-50"
                disabled={!selectedProductId}
                onClick={async () => {
                  setError(null);
                  try {
                    await linkAddonToProduct(addon.id, selectedProductId);
                    await loadProducts();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed to link add-on");
                  }
                }}
              >
                <span className="font-semibold">{L.link.en}</span>
                <span className="block text-[10px] text-cb-text-muted">{L.link.ar}</span>
              </button>
              <button
                type="button"
                className="rounded border border-cb-border px-3 py-1 text-xs disabled:opacity-50"
                disabled={!selectedProductId}
                onClick={async () => {
                  setError(null);
                  try {
                    await unlinkAddonFromProduct(addon.id, selectedProductId);
                    await loadProducts();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed to unlink add-on");
                  }
                }}
              >
                <span className="font-semibold">{L.unlink.en}</span>
                <span className="block text-[10px] text-cb-text-muted">{L.unlink.ar}</span>
              </button>
              <button
                type="button"
                className="rounded bg-red-100 px-3 py-1 text-xs"
                onClick={async () => {
                  await fetchJson("/api/admin/addons", { method: "DELETE", jsonBody: { id: addon.id } });
                  await load();
                }}
              >
                <span className="font-semibold">{L.delete.en}</span>
                <span className="block text-[10px] text-red-800/80">{L.delete.ar}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
