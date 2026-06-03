"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/http/fetch-json";
import { useLanguage } from "@/components/providers/language-provider";
import type { GiftBoxSizeConfig } from "@/lib/gift-box-builder/sizes";

const emptyForm = {
  code: "",
  name: "",
  max_items: 6,
  image_url: "",
  is_active: true,
  sort_order: 0,
};

export default function GiftBoxSizesAdminPage() {
  const { t } = useLanguage();
  const [sizes, setSizes] = useState<GiftBoxSizeConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const res = await fetchJson<{ sizes: GiftBoxSizeConfig[] }>("/api/admin/gift-box/sizes", { cache: "no-store" });
    setSizes(res.sizes ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (editingId) {
      await fetchJson("/api/admin/gift-box/sizes", { method: "PATCH", jsonBody: { id: editingId, ...form, image_url: form.image_url || null } });
    } else {
      await fetchJson("/api/admin/gift-box/sizes", { method: "POST", jsonBody: { ...form, image_url: form.image_url || null } });
    }
    setEditingId(null);
    setForm(emptyForm);
    await load();
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-cb-text-strong">{t("adminPages.giftBoxSizes.title")}</h1>
      <div className="rounded-xl border border-cb-border bg-cb-surface p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded border border-cb-border px-3 py-2" placeholder="code (small)" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <input className="rounded border border-cb-border px-3 py-2" placeholder="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input className="rounded border border-cb-border px-3 py-2" type="number" min={1} placeholder="max items" value={form.max_items} onChange={(e) => setForm((f) => ({ ...f, max_items: Number(e.target.value) }))} />
          <input className="rounded border border-cb-border px-3 py-2" type="number" min={0} placeholder="sort order" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
          <input className="rounded border border-cb-border px-3 py-2 md:col-span-2" placeholder="box image url (optional)" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            Active
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="rounded bg-cb-terracotta-dark px-4 py-2 text-sm text-white" onClick={() => void save()}>
            {editingId ? "Update Size" : "Create Size"}
          </button>
          {editingId ? (
            <button type="button" className="rounded border border-cb-border px-4 py-2 text-sm" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {sizes.map((size) => (
          <div key={size.id} className="flex items-center justify-between rounded-xl border border-cb-border bg-cb-surface p-3">
            <div>
              <p className="font-semibold">{size.name} ({size.code})</p>
              <p className="text-xs text-cb-text-muted">max_items: {size.max_items} · sort: {size.sort_order} · {size.is_active ? "active" : "inactive"}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="rounded border border-cb-border px-3 py-1 text-xs" onClick={() => {
                setEditingId(size.id);
                setForm({
                  code: size.code,
                  name: size.name,
                  max_items: size.max_items,
                  image_url: size.image_url ?? "",
                  is_active: size.is_active,
                  sort_order: size.sort_order,
                });
              }}>
                Edit
              </button>
              <button type="button" className="rounded bg-red-100 px-3 py-1 text-xs" onClick={async () => {
                await fetchJson("/api/admin/gift-box/sizes", { method: "DELETE", jsonBody: { id: size.id } });
                await load();
              }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
