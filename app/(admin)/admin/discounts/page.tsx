"use client";

import { FormEvent, useEffect, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

type Discount = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  is_active: boolean;
  valid_until: string | null;
  max_uses: number | null;
};

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("10");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/discounts", { cache: "no-store" });
      const data = (await res.json()) as { discounts?: Discount[]; error?: { en?: string } };
      if (!res.ok) throw new Error(data.error?.en ?? "Failed to load discounts");
      setDiscounts(data.discounts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void load();
    });
    return cancel;
  }, []);

  async function createDiscount(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        type,
        value: Number(value),
        active: true,
      }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => null)) as { error?: { en?: string } } | null;
      setError(d?.error?.en ?? "Failed to create discount");
      return;
    }
    setCode("");
    setValue("10");
    await load();
  }

  return (
    <section className="space-y-5">
      <header className="admin-panel-surface rounded-2xl p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">Discount Engine</h1>
        <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
          Manage promo codes with activation rules and validity windows.
        </p>
      </header>

      <form
        onSubmit={(e) => void createDiscount(e)}
        className="grid gap-3 rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 sm:grid-cols-4"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Code"
          required
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "percent" | "fixed")}
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        >
          <option value="percent">percent</option>
          <option value="fixed">fixed</option>
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="number"
          min={0}
          step="0.01"
          required
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold"
        >
          Create
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-cb-surface-2 text-left text-cb-text-muted">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Max Uses</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">State</th>
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
            ) : (
              discounts.map((d) => (
                <tr key={d.id} className="border-t border-cb-border">
                  <td className="px-4 py-3 font-semibold text-cb-text">{d.code}</td>
                  <td className="px-4 py-3">{d.type}</td>
                  <td className="px-4 py-3">{d.value}</td>
                  <td className="px-4 py-3">{d.max_uses ?? "-"}</td>
                  <td className="px-4 py-3">
                    {d.valid_until ? new Date(d.valid_until).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3">{d.is_active ? "active" : "inactive"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

