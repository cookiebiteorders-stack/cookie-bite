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
  const [defaultPrice, setDefaultPrice] = useState<number>(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetchJson<{ addons: Addon[] }>("/api/admin/addons", { cache: "no-store" });
    setAddons(res.addons ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setError(null);
    setSaving(true);
    const payload = {
      ...form,
      id: editingId ?? undefined,
      options: form.options.map((o) => ({
        ...o,
        id: o.id || crypto.randomUUID(),
      })),
    };
    try {
      if (editingId) {
        await fetchJson("/api/admin/addons", { method: "PATCH", jsonBody: { ...payload, id: editingId } });
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
      <h1 className="text-2xl font-bold text-cb-text-strong">Product Add-ons</h1>
      <div className="rounded-xl border border-cb-border bg-cb-surface p-4">
        <div className="mb-4 rounded-xl border border-cb-border bg-cb-surface-2 p-3">
          <p className="mb-2 text-xs font-bold text-cb-text-strong">AI Add-on Builder (like product AI flow)</p>
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              className="min-w-0 flex-1 rounded-lg border border-cb-border px-3 py-2"
              placeholder="Example: Create optional gift wrapping add-on with 3 tiers and realistic EGP prices"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
            <button
              type="button"
              className="rounded bg-cb-terracotta-dark px-4 py-2 text-white disabled:opacity-50"
              disabled={aiBusy || !aiPrompt.trim()}
              onClick={() => void generateWithAi()}
            >
              {aiBusy ? "Generating..." : "Generate with AI"}
            </button>
          </div>
        </div>

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
          <input
            className="rounded-lg border border-cb-border px-3 py-2"
            type="number"
            min={0}
            step="0.01"
            placeholder="Default option price (EGP)"
            value={defaultPrice}
            onChange={(e) => setDefaultPrice(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>
        <div className="mt-2">
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
            Apply default price to all options
          </button>
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
                min={0}
                step="0.01"
                placeholder="Price (EGP)"
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
            onClick={() =>
              setForm((f) => ({
                ...f,
                options: [...f.options, { ...emptyOption, price: defaultPrice }],
              }))
            }
          >
            Add option
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="rounded bg-cb-terracotta-dark px-4 py-2 text-white disabled:opacity-50" disabled={saving} onClick={() => void save()}>
            {editingId ? "Update Add-on" : "Create Add-on"}
          </button>
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
              Cancel
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </div>

      <div className="space-y-2">
        {addons.map((addon) => (
          <div key={addon.id} className="flex items-center justify-between rounded-xl border border-cb-border bg-cb-surface p-3">
            <div>
              <p className="font-semibold">{addon.name}</p>
              <p className="text-xs text-cb-text-muted">{addon.type} · {addon.required ? "required" : "optional"}</p>
              <p className="text-xs text-cb-text-muted">
                Price:{" "}
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
            <div className="flex gap-2">
              <button type="button" className="rounded border border-cb-border px-3 py-1 text-xs" onClick={() => {
                setEditingId(addon.id);
                setForm(addon);
                setDefaultPrice(Number(addon.options[0]?.price ?? 0));
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
