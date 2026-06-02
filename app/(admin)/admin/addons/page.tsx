"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/http/fetch-json";
import type { Addon } from "@/lib/addons/types";

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

export default function AdminAddonsPage() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [form, setForm] = useState<Addon>(emptyAddon);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const res = await fetchJson<{ addons: Addon[] }>("/api/admin/addons", { cache: "no-store" });
    setAddons(res.addons ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    const payload = {
      ...form,
      id: editingId ?? undefined,
      options: form.options.map((o) => ({
        ...o,
        id: o.id || crypto.randomUUID(),
      })),
    };
    if (editingId) {
      await fetchJson("/api/admin/addons", { method: "PATCH", jsonBody: { ...payload, id: editingId } });
    } else {
      await fetchJson("/api/admin/addons", { method: "POST", jsonBody: payload });
    }
    setForm(emptyAddon);
    setEditingId(null);
    await load();
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold text-cb-text-strong">Product Add-ons</h1>
      <div className="rounded-xl border border-cb-border bg-cb-surface p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-lg border border-cb-border px-3 py-2"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="rounded-lg border border-cb-border px-3 py-2"
            placeholder="Description"
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <select
            className="rounded-lg border border-cb-border px-3 py-2"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Addon["type"] }))}
          >
            <option value="single_choice">single_choice</option>
            <option value="multiple_choice">multiple_choice</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
            />
            Required
          </label>
        </div>
        <div className="mt-4 space-y-3">
          {form.options.map((op, idx) => (
            <div key={idx} className="grid gap-2 rounded-lg border border-cb-border p-3 md:grid-cols-6">
              <input
                className="rounded border border-cb-border px-2 py-1"
                placeholder="Option name"
                value={op.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    options: f.options.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                  }))
                }
              />
              <input
                className="rounded border border-cb-border px-2 py-1"
                placeholder="Size (optional)"
                value={op.size ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    options: f.options.map((x, i) => (i === idx ? { ...x, size: e.target.value } : x)),
                  }))
                }
              />
              <input
                className="rounded border border-cb-border px-2 py-1"
                type="number"
                placeholder="Price"
                value={op.price}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    options: f.options.map((x, i) => (i === idx ? { ...x, price: Number(e.target.value) } : x)),
                  }))
                }
              />
              <input
                className="rounded border border-cb-border px-2 py-1"
                type="number"
                placeholder="Quantity limit"
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
              />
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
                />
                default
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
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded bg-cb-peach px-3 py-1 text-sm"
            onClick={() => setForm((f) => ({ ...f, options: [...f.options, { ...emptyOption }] }))}
          >
            Add option
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="rounded bg-cb-terracotta-dark px-4 py-2 text-white" onClick={() => void save()}>
            {editingId ? "Update Add-on" : "Create Add-on"}
          </button>
          {editingId ? (
            <button
              type="button"
              className="rounded border border-cb-border px-4 py-2"
              onClick={() => {
                setEditingId(null);
                setForm(emptyAddon);
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {addons.map((addon) => (
          <div key={addon.id} className="flex items-center justify-between rounded-xl border border-cb-border bg-cb-surface p-3">
            <div>
              <p className="font-semibold">{addon.name}</p>
              <p className="text-xs text-cb-text-muted">{addon.type} · {addon.required ? "required" : "optional"}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="rounded border border-cb-border px-3 py-1 text-xs" onClick={() => {
                setEditingId(addon.id);
                setForm(addon);
              }}>
                Edit
              </button>
              <button
                type="button"
                className="rounded bg-red-100 px-3 py-1 text-xs"
                onClick={async () => {
                  await fetchJson("/api/admin/addons", { method: "DELETE", jsonBody: { id: addon.id } });
                  await load();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
