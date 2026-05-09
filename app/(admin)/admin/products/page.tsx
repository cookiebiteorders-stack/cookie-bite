"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

type Product = {
  id: string;
  name: string;
  title_en: string | null;
  title_ar?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  dietary?: string[] | null;
  category?: string | null;
  sku: string | null;
  stock: number;
  price_egp: number;
  is_active: boolean;
  image_url?: string | null;
};

type ProductsResponse = {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  meta?: {
    role?: string;
    permission?: "full" | "limited" | "view" | "none";
    can_write?: boolean;
    can_delete?: boolean;
  };
};

type ProductForm = {
  name: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  ingredients: string;
  category: string;
  sku: string;
  price_egp: string;
  stock: string;
  image_url: string;
  is_active: boolean;
};

type FormErrors = Partial<Record<keyof ProductForm, string>>;

const EMPTY_FORM: ProductForm = {
  name: "",
  title_en: "",
  title_ar: "",
  description_en: "",
  description_ar: "",
  ingredients: "",
  category: "",
  sku: "",
  price_egp: "",
  stock: "0",
  image_url: "",
  is_active: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState<"" | "true" | "false">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [canWrite, setCanWrite] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const limit = 20;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.set("search", search.trim());
      if (lowStockOnly) params.set("low_stock", "true");
      if (activeOnly) params.set("active", activeOnly);

      const res = await fetch(`/api/admin/products?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as ProductsResponse | { error?: { en?: string } };
      if (!res.ok) {
        throw new Error(
          "error" in data && data.error?.en ? data.error.en : "Failed to load products",
        );
      }
      const typed = data as ProductsResponse;
      setProducts(typed.products ?? []);
      setTotal(typed.total ?? 0);
      setCanWrite(Boolean(typed.meta?.can_write));
      setCanDelete(Boolean(typed.meta?.can_delete));
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeOnly, lowStockOnly, page, search]);

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void loadProducts();
    });
    return cancel;
  }, [loadProducts]);

  async function bulkToggleActive(active: boolean) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, patch: { is_active: active } }),
    });
    if (!res.ok) {
      setError("Bulk update failed");
      return;
    }
    await loadProducts();
  }

  function openCreateForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setUploadError(null);
    setFormStep(1);
    setShowForm(true);
  }

  function openEditForm(item: Product) {
    setEditing(item);
    setForm({
      name: item.name ?? "",
      title_en: item.title_en ?? "",
      title_ar: item.title_ar ?? "",
      description_en: item.description_en ?? "",
      description_ar: item.description_ar ?? "",
      ingredients: (item.dietary ?? []).join(", "),
      category: item.category ?? "",
      sku: item.sku ?? "",
      price_egp: String(item.price_egp ?? ""),
      stock: String(item.stock ?? 0),
      image_url: item.image_url ?? "",
      is_active: item.is_active,
    });
    setUploadError(null);
    setFormStep(1);
    setShowForm(true);
  }

  const formErrors = useMemo<FormErrors>(() => {
    const errors: FormErrors = {};
    if (form.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
    const price = Number(form.price_egp);
    if (!Number.isFinite(price) || price <= 0) errors.price_egp = "Valid price is required.";
    const stock = Number(form.stock);
    if (!Number.isFinite(stock) || stock < 0) errors.stock = "Stock must be 0 or greater.";
    if (form.image_url.trim()) {
      try {
        // URL validation for manual image field.
        // eslint-disable-next-line no-new
        new URL(form.image_url.trim());
      } catch {
        errors.image_url = "Image URL must be a valid link.";
      }
    }
    if (form.description_en.length > 3000) errors.description_en = "Max 3000 chars.";
    if (form.description_ar.length > 3000) errors.description_ar = "Max 3000 chars.";
    return errors;
  }, [form]);

  const hasBlockingErrors =
    Boolean(formErrors.name) ||
    Boolean(formErrors.price_egp) ||
    Boolean(formErrors.stock) ||
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

  async function handleImageUpload(file: File | null) {
    if (!file || !canWrite) return;
    setUploadingImage(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/products/upload-image", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as
        | {
            image?: { url?: string };
            error?: { en?: string };
          }
        | null;
      if (!res.ok || !data?.image?.url) {
        throw new Error(data?.error?.en || "Image upload failed");
      }
      setForm((f) => ({ ...f, image_url: data.image?.url ?? "" }));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  async function submitForm() {
    if (!canWrite || saving) return;
    if (hasBlockingErrors) {
      setError("Please fix highlighted fields before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const ingredientsList = form.ingredients
        .split(/[\n,]/g)
        .map((x) => x.trim())
        .filter(Boolean);

      const payload = {
        name: form.name.trim(),
        title_en: form.title_en.trim() || null,
        title_ar: form.title_ar.trim() || null,
        description_en: form.description_en.trim() || null,
        description_ar: form.description_ar.trim() || null,
        description:
          form.description_en.trim() || form.description_ar.trim() || null,
        dietary: ingredientsList,
        category: form.category.trim() || null,
        sku: form.sku.trim() || null,
        price_egp: Number(form.price_egp),
        stock: Number(form.stock || 0),
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
      };
      if (!payload.name || !Number.isFinite(payload.price_egp) || payload.price_egp <= 0) {
        throw new Error("Name and valid price are required");
      }
      const res = await fetch("/api/admin/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? { ids: [editing.id], patch: payload }
            : payload,
        ),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error?.en || "Save failed");
      }
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(item: Product) {
    if (!canDelete) return;
    const ok = confirm(`Delete product "${item.title_en ?? item.name}"?`);
    if (!ok) return;
    const res = await fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [item.id] }),
    });
    if (!res.ok) {
      setError("Delete failed");
      return;
    }
    await loadProducts();
  }

  function toggleSelection(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (products.length === 0) return;
    const allSelected = products.every((p) => selected.has(p.id));
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(products.map((p) => p.id)));
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <div>
          <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
            Product Management
          </h1>
          <p className="mt-2 text-sm text-cb-text">
            Manage catalog, variants, pricing, stock thresholds, and publishing state.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canWrite}
            className="inline-flex items-center gap-2 rounded-xl bg-cb-terracotta-dark px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cb-terracotta hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            onClick={openCreateForm}
          >
            <span className="text-lg leading-none">+</span> Add Product
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search by name / sku / slug"
            className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
          />
          <label className="inline-flex items-center gap-2 rounded-xl border border-cb-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setPage(1);
                setLowStockOnly(e.target.checked);
              }}
            />
            Low stock only
          </label>
          <select
            value={activeOnly}
            onChange={(e) => {
              setPage(1);
              setActiveOnly(e.target.value as "" | "true" | "false");
            }}
            aria-label="Filter by state"
            className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
          >
            <option value="">All states</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
          <button
            type="button"
            onClick={() => void loadProducts()}
            className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold"
          >
            Refresh
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selected.size === 0 || !canWrite}
              onClick={() => void bulkToggleActive(true)}
              className="rounded-xl border border-cb-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              Activate
            </button>
            <button
              type="button"
              disabled={selected.size === 0 || !canWrite}
              onClick={() => void bulkToggleActive(false)}
              className="rounded-xl border border-cb-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              Deactivate
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-cb-surface-2 text-left text-cb-text-muted">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all products"
                  checked={products.length > 0 && products.every((p) => selected.has(p.id))}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Price (EGP)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-3 text-cb-text-muted" colSpan={7}>
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-3 text-red-600" colSpan={7}>
                  {error}
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-cb-text-muted" colSpan={7}>
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((item) => {
                const label = item.title_en ?? item.name;
                const statusLabel = !item.is_active
                  ? "Inactive"
                  : item.stock <= 0
                    ? "Out of Stock"
                    : item.stock <= 10
                      ? "Low Stock"
                      : "Active";
                return (
                  <tr key={item.id} className="border-t border-cb-border">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${label}`}
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelection(item.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-cb-text">{label}</td>
                    <td className="px-4 py-3 text-cb-text-muted">{item.sku ?? "-"}</td>
                    <td className="px-4 py-3 text-cb-text">{item.stock}</td>
                    <td className="px-4 py-3 text-cb-text">{item.price_egp}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-cb-surface-2 px-2 py-0.5 text-xs font-semibold text-cb-text-strong">
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={!canWrite}
                        className="text-xs font-semibold text-cb-text hover:text-cb-terracotta-dark mr-3"
                        onClick={() => openEditForm(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={!canDelete}
                        className="text-xs font-semibold text-red-500 hover:text-red-700"
                        onClick={() => void deleteProduct(item)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-cb-border bg-cb-surface-elevated px-4 py-3 text-sm">
        <p className="text-cb-text-muted">
          Page {page} / {totalPages} - Total products: {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-cb-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-cb-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-[70] bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div
            className="mx-auto mt-10 w-full max-w-2xl rounded-2xl border border-cb-border bg-cb-surface-elevated p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-2xl font-bold text-cb-text-strong">
              {editing ? "Edit Product" : "Add Product"}
            </h2>
            <p className="mt-1 text-sm text-cb-text-muted">
              Owner/Admin can add and update product data shown across the website.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-cb-border bg-cb-surface p-2 text-xs font-semibold">
              {[
                { id: 1, label: "Step 1: Basic" },
                { id: 2, label: "Step 2: Content" },
                { id: 3, label: "Step 3: Media & Pricing" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    const target = s.id as 1 | 2 | 3;
                    if (!canEnterStep[target]) return;
                    setFormStep(target);
                  }}
                  disabled={!canEnterStep[s.id as 1 | 2 | 3]}
                  className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 transition ${
                    formStep === s.id
                      ? "bg-cb-terracotta-dark text-white"
                      : canEnterStep[s.id as 1 | 2 | 3]
                        ? "text-cb-text hover:bg-cb-surface-2"
                        : "cursor-not-allowed text-cb-text-muted/60"
                  }`}
                >
                  {stepDone[s.id as 1 | 2 | 3] ? (
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                        formStep === s.id
                          ? "bg-white/25 text-white"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                      aria-hidden
                    >
                      ✓
                    </span>
                  ) : (
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                        formStep === s.id
                          ? "bg-white/20 text-white"
                          : "bg-cb-surface-2 text-cb-text-muted"
                      }`}
                      aria-hidden
                    >
                      {s.id}
                    </span>
                  )}
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className={`space-y-1 ${formStep === 1 ? "" : "hidden"}`}>
                <span className="text-xs font-semibold text-cb-text-muted">Product name * (الاسم الكامل للمنتج)</span>
                <div className="grid grid-cols-2 text-[11px] text-cb-text-muted">
                  <span className="text-left">Write clear public product name.</span>
                  <span className="text-right">اكتب اسم المنتج كامل وواضح للعميل.</span>
                </div>
                <input className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm" placeholder="e.g. Double Choco Chip" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                {formErrors.name ? <p className="text-xs text-red-600">{formErrors.name}</p> : null}
              </label>
              <label className={`space-y-1 ${formStep === 1 ? "" : "hidden"}`}>
                <span className="text-xs font-semibold text-cb-text-muted">Stock Keeping Unit (SKU)</span>
                <div className="grid grid-cols-2 text-[11px] text-cb-text-muted">
                  <span className="text-left">Internal unique stock code.</span>
                  <span className="text-right">كود داخلي فريد للمخزون.</span>
                </div>
                <input className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm" placeholder="Unique stock code" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
              </label>
              <label className={`space-y-1 ${formStep === 1 ? "" : "hidden"}`}>
                <span className="text-xs font-semibold text-cb-text-muted">Title EN</span>
                <div className="grid grid-cols-2 text-[11px] text-cb-text-muted">
                  <span className="text-left">English title shown on storefront.</span>
                  <span className="text-right">العنوان الإنجليزي الظاهر في الموقع.</span>
                </div>
                <input className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm" placeholder="Public title in English" value={form.title_en} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} />
              </label>
              <label className={`space-y-1 ${formStep === 1 ? "" : "hidden"}`}>
                <span className="text-xs font-semibold text-cb-text-muted">Title AR</span>
                <div className="grid grid-cols-2 text-[11px] text-cb-text-muted">
                  <span className="text-left">Arabic title shown on storefront.</span>
                  <span className="text-right">العنوان العربي الظاهر في الموقع.</span>
                </div>
                <input className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm" placeholder="Public title in Arabic" value={form.title_ar} onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))} />
              </label>
              <label className={`space-y-1 sm:col-span-2 ${formStep === 2 ? "" : "hidden"}`}>
                <span className="text-xs font-semibold text-cb-text-muted">Description EN</span>
                <div className="grid grid-cols-2 text-[11px] text-cb-text-muted">
                  <span className="text-left">Marketing/product description in English.</span>
                  <span className="text-right">الوصف التسويقي للمنتج باللغة الإنجليزية.</span>
                </div>
                <textarea className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm min-h-20" placeholder="Rich cookie description in English..." value={form.description_en} onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))} />
                {formErrors.description_en ? <p className="text-xs text-red-600">{formErrors.description_en}</p> : null}
              </label>
              <label className={`space-y-1 sm:col-span-2 ${formStep === 2 ? "" : "hidden"}`}>
                <span className="text-xs font-semibold text-cb-text-muted">Description AR</span>
                <div className="grid grid-cols-2 text-[11px] text-cb-text-muted">
                  <span className="text-left">Marketing/product description in Arabic.</span>
                  <span className="text-right">الوصف التسويقي للمنتج باللغة العربية.</span>
                </div>
                <textarea className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm min-h-20" placeholder="وصف جذاب للمنتج بالعربية..." value={form.description_ar} onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))} />
                {formErrors.description_ar ? <p className="text-xs text-red-600">{formErrors.description_ar}</p> : null}
              </label>
              <label className={`space-y-1 sm:col-span-2 ${formStep === 2 ? "" : "hidden"}`}>
                <span className="text-xs font-semibold text-cb-text-muted">Ingredients (المكونات)</span>
                <div className="grid grid-cols-2 text-[11px] text-cb-text-muted">
                  <span className="text-left">Comma-separated, e.g. Flour, Butter, Chocolate.</span>
                  <span className="text-right">اكتب المكونات مفصولة بفاصلة مثل: دقيق، زبدة، شيكولاتة.</span>
                </div>
                <textarea className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm min-h-20" placeholder="Flour, Butter, Sugar, Chocolate..." value={form.ingredients} onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))} />
              </label>
              <label className={`space-y-1 ${formStep === 3 ? "" : "hidden"}`}>
                <span className="text-xs font-semibold text-cb-text-muted">Category</span>
                <div className="grid grid-cols-2 text-[11px] text-cb-text-muted">
                  <span className="text-left">Group for filtering in shop/search.</span>
                  <span className="text-right">تصنيف المنتج للفلترة في المتجر والبحث.</span>
                </div>
                <input className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm" placeholder="Classic / Seasonal / Gift..." value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              </label>
              <label className={`space-y-1 ${formStep === 3 ? "" : "hidden"}`}>
                <span className="text-xs font-semibold text-cb-text-muted">Price EGP *</span>
                <div className="grid grid-cols-2 text-[11px] text-cb-text-muted">
                  <span className="text-left">Customer selling price in EGP.</span>
                  <span className="text-right">سعر البيع للعميل بالجنيه المصري.</span>
                </div>
                <input className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.price_egp} onChange={(e) => setForm((f) => ({ ...f, price_egp: e.target.value }))} />
                {formErrors.price_egp ? <p className="text-xs text-red-600">{formErrors.price_egp}</p> : null}
              </label>
              <label className={`space-y-1 ${formStep === 3 ? "" : "hidden"}`}>
                <span className="text-xs font-semibold text-cb-text-muted">Stock</span>
                <div className="grid grid-cols-2 text-[11px] text-cb-text-muted">
                  <span className="text-left">Available quantity in inventory.</span>
                  <span className="text-right">الكمية المتاحة حاليًا في المخزون.</span>
                </div>
                <input className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm" type="number" min="0" step="1" placeholder="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
                {formErrors.stock ? <p className="text-xs text-red-600">{formErrors.stock}</p> : null}
              </label>
              <label className={`inline-flex items-center gap-2 rounded-xl border border-cb-border px-3 py-2 text-sm ${formStep === 3 ? "" : "hidden"}`}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                Active (visible to customers)
              </label>
            </div>

            <div className={`mt-4 rounded-xl border border-cb-border bg-cb-surface p-3 ${formStep === 3 ? "" : "hidden"}`}>
              <p className="text-xs font-semibold text-cb-text-muted">Product image</p>
              <p className="mt-1 text-xs text-cb-text-muted">
                Upload from your device (JPG, PNG, WEBP, GIF up to 6MB), or paste image URL manually.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  className="rounded-xl border border-cb-border px-3 py-2 text-sm"
                  placeholder="https://..."
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                />
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold hover:bg-cb-surface-2">
                  {uploadingImage ? "Uploading..." : "Upload from device"}
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
                  <img
                    src={form.image_url}
                    alt="Product preview"
                    className="h-36 w-full object-cover"
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                disabled={formStep === 1}
                onClick={() => setFormStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
              >
                Back
              </button>
              <button
                type="button"
                className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                disabled={formStep === 3 || !stepDone[formStep]}
                onClick={() => setFormStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))}
              >
                Next
              </button>
              <button type="button" className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="button" disabled={saving || !canWrite || hasBlockingErrors} className="rounded-xl bg-cb-terracotta-dark px-4 py-2 text-sm font-bold text-white disabled:opacity-50" onClick={() => void submitForm()}>
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

