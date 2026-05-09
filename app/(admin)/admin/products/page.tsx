"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

type Product = {
  id: string;
  name: string;
  title_en: string | null;
  sku: string | null;
  stock: number;
  price_egp: number;
  is_active: boolean;
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
  category: string;
  sku: string;
  price_egp: string;
  stock: string;
  image_url: string;
  is_active: boolean;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  title_en: "",
  title_ar: "",
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
    setShowForm(true);
  }

  function openEditForm(item: Product) {
    setEditing(item);
    setForm({
      name: item.name ?? "",
      title_en: item.title_en ?? "",
      title_ar: "",
      category: "",
      sku: item.sku ?? "",
      price_egp: String(item.price_egp ?? ""),
      stock: String(item.stock ?? 0),
      image_url: "",
      is_active: item.is_active,
    });
    setShowForm(true);
  }

  async function submitForm() {
    if (!canWrite || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        title_en: form.title_en.trim() || null,
        title_ar: form.title_ar.trim() || null,
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input className="rounded-xl border border-cb-border px-3 py-2 text-sm" placeholder="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <input className="rounded-xl border border-cb-border px-3 py-2 text-sm" placeholder="SKU" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
              <input className="rounded-xl border border-cb-border px-3 py-2 text-sm" placeholder="Title EN" value={form.title_en} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} />
              <input className="rounded-xl border border-cb-border px-3 py-2 text-sm" placeholder="Title AR" value={form.title_ar} onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))} />
              <input className="rounded-xl border border-cb-border px-3 py-2 text-sm" placeholder="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              <input className="rounded-xl border border-cb-border px-3 py-2 text-sm" placeholder="Image URL" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
              <input className="rounded-xl border border-cb-border px-3 py-2 text-sm" type="number" min="0.01" step="0.01" placeholder="Price EGP *" value={form.price_egp} onChange={(e) => setForm((f) => ({ ...f, price_egp: e.target.value }))} />
              <input className="rounded-xl border border-cb-border px-3 py-2 text-sm" type="number" min="0" step="1" placeholder="Stock" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
              <label className="inline-flex items-center gap-2 rounded-xl border border-cb-border px-3 py-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                Active
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="button" disabled={saving || !canWrite} className="rounded-xl bg-cb-terracotta-dark px-4 py-2 text-sm font-bold text-white disabled:opacity-50" onClick={() => void submitForm()}>
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

