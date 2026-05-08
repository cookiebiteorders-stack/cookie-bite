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
      <header className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
          Product Management
        </h1>
        <p className="mt-2 text-sm text-cb-text">
          Manage catalog, variants, pricing, stock thresholds, and publishing state.
        </p>
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
              disabled={selected.size === 0}
              onClick={() => void bulkToggleActive(true)}
              className="rounded-xl border border-cb-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              Activate
            </button>
            <button
              type="button"
              disabled={selected.size === 0}
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
                  checked={products.length > 0 && products.every((p) => selected.has(p.id))}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Price (EGP)</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-3 text-cb-text-muted" colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-3 text-red-600" colSpan={6}>
                  {error}
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-cb-text-muted" colSpan={6}>
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
    </section>
  );
}

