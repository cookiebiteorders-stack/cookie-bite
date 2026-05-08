"use client";

import { FormEvent, useEffect, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

type Zone = {
  id: string;
  name: string;
  cities: string[];
  base_fee_egp: number;
  free_shipping_threshold_egp: number | null;
  eta_min_days: number;
  eta_max_days: number;
  is_active: boolean;
};

export default function AdminShippingPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [cities, setCities] = useState("");
  const [baseFee, setBaseFee] = useState("0");
  const [etaMin, setEtaMin] = useState("1");
  const [etaMax, setEtaMax] = useState("3");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/shipping-zones", { cache: "no-store" });
      const d = (await res.json()) as { zones?: Zone[]; error?: { en?: string } };
      if (!res.ok) throw new Error(d.error?.en ?? "Failed to load zones");
      setZones(d.zones ?? []);
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

  async function createZone(e: FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      cities: cities
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      base_fee_egp: Number(baseFee),
      eta_min_days: Number(etaMin),
      eta_max_days: Number(etaMax),
      is_active: true,
    };
    const res = await fetch("/api/admin/shipping-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => null)) as { error?: { en?: string } } | null;
      setError(d?.error?.en ?? "Failed to create zone");
      return;
    }
    setName("");
    setCities("");
    setBaseFee("0");
    await load();
  }

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
          Shipping Orchestration
        </h1>
        <p className="mt-2 text-sm text-cb-text">
          Manage delivery zones, fees, and SLA ranges.
        </p>
      </header>

      <form
        onSubmit={(e) => void createZone(e)}
        className="grid gap-3 rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 sm:grid-cols-5"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Zone name"
          required
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
        <input
          value={cities}
          onChange={(e) => setCities(e.target.value)}
          placeholder="Cities (comma-separated)"
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          step="0.01"
          value={baseFee}
          onChange={(e) => setBaseFee(e.target.value)}
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          value={etaMin}
          onChange={(e) => setEtaMin(e.target.value)}
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          value={etaMax}
          onChange={(e) => setEtaMax(e.target.value)}
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold sm:col-span-5"
        >
          Add Zone
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-cb-surface-2 text-left text-cb-text-muted">
            <tr>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Cities</th>
              <th className="px-4 py-3">Base Fee</th>
              <th className="px-4 py-3">Free Threshold</th>
              <th className="px-4 py-3">ETA</th>
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
              zones.map((z) => (
                <tr key={z.id} className="border-t border-cb-border">
                  <td className="px-4 py-3 font-semibold">{z.name}</td>
                  <td className="px-4 py-3 text-cb-text-muted">{z.cities.join(", ") || "-"}</td>
                  <td className="px-4 py-3">EGP {z.base_fee_egp}</td>
                  <td className="px-4 py-3">
                    {z.free_shipping_threshold_egp
                      ? `EGP ${z.free_shipping_threshold_egp}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {z.eta_min_days}-{z.eta_max_days} days
                  </td>
                  <td className="px-4 py-3">{z.is_active ? "active" : "inactive"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

