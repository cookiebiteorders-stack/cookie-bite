"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, X } from "lucide-react";
import { parsePromoMetadata } from "@/lib/promo/promo-metadata";

export type DiscountRow = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  is_active: boolean;
  valid_until: string | null;
  valid_from?: string;
  max_uses: number | null;
  max_uses_per_user?: number;
  used_count: number;
  min_order_amount_egp?: number;
  metadata?: Record<string, unknown> | null;
};

type Props = {
  discount: DiscountRow | null;
  onClose: () => void;
  onSaved: () => void;
  adminT: (key: string, vars?: Record<string, string | number>) => string;
  apiErr: (err: { en?: string; ar?: string } | undefined, fallback: string) => string;
};

export function DiscountEditModal({ discount, onClose, onSaved, adminT, apiErr }: Props) {
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [maxPerUser, setMaxPerUser] = useState("1");
  const [active, setActive] = useState(true);
  const [campaignTag, setCampaignTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!discount) return;
    setValue(String(discount.value));
    setMaxUses(discount.max_uses != null ? String(discount.max_uses) : "");
    setMinOrder(String(discount.min_order_amount_egp ?? 0));
    setExpiry(
      discount.valid_until ? new Date(discount.valid_until).toISOString().slice(0, 10) : "",
    );
    setMaxPerUser(String(discount.max_uses_per_user ?? 1));
    setActive(discount.is_active);
    const meta = parsePromoMetadata(discount.metadata);
    setCampaignTag(meta.campaign_tag ?? "");
    setError(null);
  }, [discount]);

  if (!discount) return null;

  const save = async () => {
    setBusy(true);
    setError(null);
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setError(adminT("discounts.errors.invalidValue"));
      setBusy(false);
      return;
    }

    let expires_at: string | null = null;
    if (expiry.trim()) {
      const d = new Date(expiry);
      if (Number.isNaN(d.getTime())) {
        setError(adminT("discounts.errors.invalidExpiry"));
        setBusy(false);
        return;
      }
      expires_at = d.toISOString();
    }

    const meta = parsePromoMetadata(discount.metadata);
    meta.campaign_tag = campaignTag.trim() || undefined;

    const body: Record<string, unknown> = {
      is_active: active,
      value: numericValue,
      min_order_amount_egp: Number(minOrder) || 0,
      max_uses_per_user: Math.max(1, parseInt(maxPerUser, 10) || 1),
      expires_at,
      metadata: meta,
    };
    if (maxUses.trim()) {
      const mu = Number(maxUses);
      if (Number.isFinite(mu) && mu >= 1) body.max_uses = mu;
    } else {
      body.max_uses = null;
    }

    const res = await fetch(`/api/admin/discounts/${discount.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => null)) as { error?: { en?: string } } | null;
      setError(apiErr(d?.error, adminT("discounts.errors.updateFailed")));
      setBusy(false);
      return;
    }
    onSaved();
    onClose();
    setBusy(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          className="w-full max-w-lg rounded-2xl border border-cb-border bg-white p-6 shadow-2xl"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-lg font-bold text-stone-950">
              {adminT("discounts.editTitle")} — {discount.code}
            </h2>
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase text-stone-700">
              {adminT("discounts.fields.value")}
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold uppercase text-stone-700">
              {adminT("discounts.fields.minOrder")}
              <input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold uppercase text-stone-700">
              {adminT("discounts.fields.maxUses")}
              <input
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder={adminT("discounts.unlimited")}
                className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold uppercase text-stone-700">
              {adminT("discounts.fields.expiry")}
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold uppercase text-stone-700 sm:col-span-2">
              {adminT("discounts.fields.campaignTag")}
              <input
                value={campaignTag}
                onChange={(e) => setCampaignTag(e.target.value)}
                className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-stone-800 sm:col-span-2">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              {adminT("discounts.activate")}
            </label>
          </div>

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-sm font-bold">
              {adminT("discounts.cancel")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#E67E22] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {adminT("discounts.save")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
