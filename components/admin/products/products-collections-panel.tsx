"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderPlus, Loader2, Pencil, Trash2, X } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { useProductsDashboardStore } from "@/stores/products-dashboard-store";
import { cn } from "@/lib/utils";

type CollectionRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  product_count: number;
  is_active: boolean;
};

type CollectionProduct = {
  id: string;
  slug: string;
  name: string;
  title_en: string | null;
  title_ar: string | null;
  sku: string | null;
  sort_order?: number;
};

type Props = {
  canWrite: boolean;
};

export function ProductsCollectionsPanel({ canWrite }: Props) {
  const products = useProductsDashboardStore((s) => s.products);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionName, setCollectionName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProducts, setEditProducts] = useState<CollectionProduct[]>([]);
  const [editName, setEditName] = useState("");
  const [productQuery, setProductQuery] = useState("");

  const reload = useCallback(() => {
    setLoading(true);
    void fetchJson<{ collections: CollectionRow[] }>("/api/admin/products/collections", {
      cache: "no-store",
    })
      .then((res) => setCollections(res.collections ?? []))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createCollection = async () => {
    if (!collectionName.trim() || !canWrite) return;
    setBusy(true);
    try {
      await fetchJson("/api/admin/products/collections", {
        method: "POST",
        jsonBody: { name_en: collectionName.trim() },
      });
      setCollectionName("");
      reload();
    } finally {
      setBusy(false);
    }
  };

  const openEditor = async (collection: CollectionRow) => {
    setEditingId(collection.id);
    setEditName(collection.name_ar ?? collection.name_en);
    setProductQuery("");
    try {
      const res = await fetchJson<{ products: CollectionProduct[] }>(
        `/api/admin/products/collections/${collection.id}`,
        { cache: "no-store" },
      );
      setEditProducts(res.products ?? []);
    } catch {
      setEditProducts([]);
    }
  };

  const closeEditor = () => {
    setEditingId(null);
    setEditProducts([]);
  };

  const saveCollection = async () => {
    if (!editingId || !canWrite) return;
    setBusy(true);
    try {
      await fetchJson(`/api/admin/products/collections/${editingId}`, {
        method: "PATCH",
        jsonBody: {
          name_en: editName.trim() || undefined,
          product_ids: editProducts.map((p) => p.id),
        },
      });
      closeEditor();
      reload();
    } finally {
      setBusy(false);
    }
  };

  const deleteCollection = async (id: string) => {
    if (!canWrite || !window.confirm("حذف هذه المجموعة؟")) return;
    setBusy(true);
    try {
      await fetchJson(`/api/admin/products/collections/${id}`, { method: "DELETE" });
      if (editingId === id) closeEditor();
      reload();
    } finally {
      setBusy(false);
    }
  };

  const addProduct = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p || editProducts.some((ep) => ep.id === productId)) return;
    setEditProducts((prev) => [
      ...prev,
      {
        id: p.id,
        slug: p.slug ?? "",
        name: p.name,
        title_en: p.title_en ?? null,
        title_ar: p.title_ar ?? null,
        sku: p.sku ?? null,
      },
    ]);
  };

  const removeProduct = (productId: string) => {
    setEditProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const pickerOptions = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    const selected = new Set(editProducts.map((p) => p.id));
    return products
      .filter((p) => !selected.has(p.id))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.title_en ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [products, editProducts, productQuery]);

  return (
    <section className="rounded-2xl border border-cb-border/80 bg-cb-surface-elevated/90 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-cb-text-strong">
        <FolderPlus className="h-4 w-4" aria-hidden />
        Collections (مجموعات المنتجات)
      </h3>
      <div className="mt-2 flex gap-2">
        <input
          value={collectionName}
          onChange={(e) => setCollectionName(e.target.value)}
          disabled={!canWrite || busy}
          placeholder="اسم المجموعة"
          className="flex-1 rounded-lg border border-cb-border px-2 py-1.5 text-xs"
        />
        <button
          type="button"
          disabled={!canWrite || busy}
          onClick={() => void createCollection()}
          className="rounded-lg border border-cb-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء"}
        </button>
      </div>
      {loading ? (
        <p className="mt-2 text-xs text-cb-text-muted">…</p>
      ) : (
        <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-xs">
          {collections.length === 0 ? (
            <li className="text-cb-text-muted">لا collections بعد.</li>
          ) : (
            collections.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-2 py-1",
                  editingId === c.id ? "bg-amber-100/80 dark:bg-amber-950/40" : "bg-white/70 dark:bg-cb-surface",
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-start font-semibold"
                  onClick={() => void openEditor(c)}
                >
                  {c.name_ar ?? c.name_en}
                  <span className="ms-1 font-normal text-cb-text-muted">({c.product_count})</span>
                </button>
                {canWrite ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      title="تعديل"
                      onClick={() => void openEditor(c)}
                      className="rounded p-1 hover:bg-amber-200/50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="حذف"
                      onClick={() => void deleteCollection(c.id)}
                      className="rounded p-1 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      )}

      {editingId ? (
        <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-cb-text-strong">تعديل المجموعة</h4>
            <button type="button" onClick={closeEditor} className="rounded p-1 hover:bg-white/60">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={!canWrite || busy}
            className="mt-2 w-full rounded-lg border border-cb-border px-2 py-1.5 text-xs"
            placeholder="اسم المجموعة"
          />
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-cb-text-muted">
            المنتجات ({editProducts.length})
          </p>
          <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto">
            {editProducts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1 text-xs dark:bg-cb-surface"
              >
                <span className="truncate">{p.title_ar ?? p.title_en ?? p.name}</span>
                {canWrite ? (
                  <button type="button" onClick={() => removeProduct(p.id)} className="text-red-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {canWrite ? (
            <>
              <input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="بحث منتج للإضافة…"
                className="mt-2 w-full rounded-lg border border-cb-border px-2 py-1.5 text-xs"
              />
              {pickerOptions.length > 0 ? (
                <ul className="mt-1 max-h-24 space-y-1 overflow-y-auto rounded-lg border border-cb-border/60 bg-white p-1 dark:bg-cb-surface">
                  {pickerOptions.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => addProduct(p.id)}
                        className="w-full rounded px-2 py-1 text-start text-xs hover:bg-amber-50"
                      >
                        {p.title_ar ?? p.title_en ?? p.name}
                        {p.sku ? <span className="text-cb-text-muted"> · {p.sku}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveCollection()}
                className="mt-3 rounded-lg bg-stone-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900"
              >
                {busy ? <Loader2 className="inline h-4 w-4 animate-spin" /> : "حفظ المجموعة"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
