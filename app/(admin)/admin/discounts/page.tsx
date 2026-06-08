"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Brain,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  Copy,
  Filter,
  Gift,
  Pencil,
  Percent,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Truck,
  Users,
  WandSparkles,
} from "lucide-react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { cn } from "@/lib/utils";
import { useAdminT } from "@/lib/admin/use-admin-t";
import { useLanguage } from "@/components/providers/language-provider";
import type { PromoRuleKey } from "@/lib/promo/promo-metadata";
import { parsePromoMetadata } from "@/lib/promo/promo-metadata";
import { ImportExportToolbar } from "@/components/admin/import-export/import-export-toolbar";
import { ExportModal } from "@/components/admin/import-export/export-modal";
import { DiscountEditModal, type DiscountRow } from "@/components/admin/discounts/discount-edit-modal";
import { DiscountAiMenu } from "@/components/admin/discounts/discount-ai-menu";
import { FreeShippingSettingsPanel } from "@/components/admin/discounts/free-shipping-settings-panel";

type Discount = DiscountRow;

type BuilderType =
  | "percent"
  | "fixed"
  | "shipping"
  | "bogo"
  | "bundle"
  | "vip"
  | "first-order"
  | "seasonal"
  | "loyalty";

const typeOptionIds: Array<{
  id: BuilderType;
  icon: typeof Percent;
  labelKey: string;
  hintKey: string;
}> = [
  { id: "percent", labelKey: "types.percent.label", hintKey: "types.percent.hint", icon: Percent },
  { id: "fixed", labelKey: "types.fixed.label", hintKey: "types.fixed.hint", icon: CircleDollarSign },
  { id: "shipping", labelKey: "types.shipping.label", hintKey: "types.shipping.hint", icon: Truck },
  { id: "bogo", labelKey: "types.bogo.label", hintKey: "types.bogo.hint", icon: Gift },
  { id: "bundle", labelKey: "types.bundle.label", hintKey: "types.bundle.hint", icon: Ticket },
  { id: "vip", labelKey: "types.vip.label", hintKey: "types.vip.hint", icon: ShieldCheck },
  { id: "first-order", labelKey: "types.firstOrder.label", hintKey: "types.firstOrder.hint", icon: Sparkles },
  { id: "seasonal", labelKey: "types.seasonal.label", hintKey: "types.seasonal.hint", icon: CalendarClock },
  { id: "loyalty", labelKey: "types.loyalty.label", hintKey: "types.loyalty.hint", icon: Users },
];

type StatusKey = "paused" | "active" | "expired" | "expiringSoon";

function statusKey(d: Pick<Discount, "is_active" | "valid_until">): StatusKey {
  if (!d.is_active) return "paused";
  if (!d.valid_until) return "active";
  const end = new Date(d.valid_until).getTime();
  const now = Date.now();
  if (Number.isNaN(end)) return "active";
  if (end < now) return "expired";
  if (end - now < 1000 * 60 * 60 * 24 * 3) return "expiringSoon";
  return "active";
}

function statusClass(key: StatusKey) {
  if (key === "active") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200";
  if (key === "expiringSoon") return "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200";
  if (key === "expired") return "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200";
  return "bg-stone-200 text-stone-800";
}

export default function AdminDiscountsPage() {
  const { adminT, apiErr } = useAdminT();
  const { lang } = useLanguage();

  const typeOptions = useMemo(
    () =>
      typeOptionIds.map((opt) => ({
        ...opt,
        label: adminT(`discounts.${opt.labelKey}`),
        hint: adminT(`discounts.${opt.hintKey}`),
      })),
    [adminT],
  );

  const typeLabel = (type: Discount["type"]) =>
    type === "percent" ? adminT("discounts.typePercent") : adminT("discounts.typeFixed");

  const statusLabel = (d: Discount) => adminT(`discounts.status.${statusKey(d)}`);

  const ruleOptions = useMemo(
    () =>
      (
        [
          ["cart_total", "discounts.rules.cartTotal"],
          ["cookies_only", "discounts.rules.cookiesOnly"],
          ["first_order", "discounts.rules.firstTime"],
          ["vip_only", "discounts.rules.vipOnly"],
        ] as const
      ).map(([key, labelKey]) => ({
        key: key as PromoRuleKey,
        label: adminT(labelKey),
      })),
    [adminT],
  );

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editTarget, setEditTarget] = useState<Discount | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const [step, setStep] = useState(1);
  const [builderType, setBuilderType] = useState<BuilderType>("percent");
  const [code, setCode] = useState("");
  const [value, setValue] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expiry, setExpiry] = useState("");
  const [minOrder, setMinOrder] = useState("0");
  const [campaignTag, setCampaignTag] = useState("Seasonal");
  const [ruleMode, setRuleMode] = useState<"AND" | "OR">("AND");
  const [selectedRules, setSelectedRules] = useState<PromoRuleKey[]>([]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "expired">("all");
  const [sortBy, setSortBy] = useState<"performance" | "code" | "value" | "expires">("performance");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/discounts", { cache: "no-store" });
      const data = (await res.json()) as {
        discounts?: Discount[];
        error?: { en?: string };
      };
      if (!res.ok) throw new Error(apiErr(data.error, adminT("discounts.errors.loadFailed")));
      setDiscounts(data.discounts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : adminT("discounts.errors.unknown"));
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

  const aiHints = useMemo(() => {
    const numValue = Number(value) || 0;
    const overlap = discounts.find((d) => d.code.toLowerCase() === code.trim().toLowerCase());
    const hasHigh = discounts.some((d) => d.type === "percent" && d.value >= 20 && d.is_active);
    const conversion = numValue <= 10 ? 7 : numValue <= 15 ? 11 : 15;
    const pct = numValue >= 15 ? "15%" : "10%";
    return [
      adminT("discounts.aiHints.conversion", { pct, lift: conversion }),
      overlap
        ? adminT("discounts.aiHints.duplicate", { code: overlap.code })
        : adminT("discounts.aiHints.noDuplicate"),
      hasHigh ? adminT("discounts.aiHints.marginRisk") : adminT("discounts.aiHints.marginOk"),
      adminT("discounts.aiHints.launchWindow"),
    ];
  }, [adminT, code, discounts, value]);

  async function createDiscount(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!code.trim()) {
      setError(adminT("discounts.errors.codeRequired"));
      return;
    }

    let expiresAtIso: string | undefined;
    if (expiry?.trim()) {
      const d = new Date(expiry);
      if (Number.isNaN(d.getTime())) {
        setError(adminT("discounts.errors.invalidExpiry"));
        return;
      }
      expiresAtIso = d.toISOString();
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setError(adminT("discounts.errors.invalidValue"));
      return;
    }
    if (builderType !== "fixed" && numericValue > 100) {
      setError(adminT("discounts.errors.percentMax"));
      return;
    }

    setCreating(true);
    const payload: Record<string, unknown> = {
      code: code.trim(),
      builder_type: builderType,
      value: numericValue,
      active: true,
      min_order_amount_egp: Number(minOrder) || 0,
      campaign_tag: campaignTag,
      rule_mode: ruleMode,
      rule_keys: selectedRules,
    };
    if (maxUses.trim()) {
      const mu = Number(maxUses);
      if (Number.isFinite(mu) && mu >= 1) payload.max_uses = mu;
    }
    if (expiresAtIso) payload.expires_at = expiresAtIso;

    const res = await fetch("/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setCreating(false);

    if (!res.ok) {
      const d = (await res.json().catch(() => null)) as { error?: { en?: string } } | null;
      setError(apiErr(d?.error, adminT("discounts.errors.createFailed")));
      return;
    }

    setCode("");
    setValue("10");
    setMaxUses("");
    setExpiry("");
    setMinOrder("0");
    setSelectedRules([]);
    setStep(1);
    setSuccess(adminT("discounts.createdSuccess"));
    await load();
  }

  async function duplicateDiscount(d: Discount) {
    setError(null);
    const res = await fetch(`/api/admin/discounts/${d.id}/duplicate`, { method: "POST" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: { en?: string } } | null;
      setError(apiErr(data?.error, adminT("discounts.errors.duplicateFailed")));
      return;
    }
    setSuccess(adminT("discounts.duplicatedSuccess"));
    await load();
  }

  async function pauseExpiringSoon() {
    const targets = discounts.filter((d) => statusKey(d) === "expiringSoon" && d.is_active);
    if (!targets.length) {
      setSuccess(adminT("discounts.noExpiringToPause"));
      return;
    }
    for (const d of targets) {
      await fetch(`/api/admin/discounts/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });
    }
    setSuccess(adminT("discounts.pausedExpiring", { count: targets.length }));
    await load();
  }

  function copyCode(text: string) {
    void navigator.clipboard.writeText(text);
    setSuccess(adminT("discounts.copiedCode"));
  }

  function kindLabel(d: Discount): string {
    const meta = parsePromoMetadata(d.metadata);
    if (meta.free_shipping) return adminT("discounts.types.shipping.label");
    if (meta.kind) {
      const k = typeOptionIds.find((t) => t.id === meta.kind);
      if (k) return adminT(`discounts.${k.labelKey}`);
    }
    return typeLabel(d.type);
  }

  async function toggleActive(d: Discount) {
    setError(null);
    const res = await fetch(`/api/admin/discounts/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !d.is_active }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: { en?: string } } | null;
      setError(apiErr(data?.error, adminT("discounts.errors.updateFailed")));
      return;
    }
    await load();
  }

  async function deleteDiscount(d: Discount) {
    if (!window.confirm(adminT("discounts.confirmDelete", { code: d.code }))) return;
    setError(null);
    const res = await fetch(`/api/admin/discounts/${d.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: { en?: string; ar?: string } } | null;
      setError(apiErr(data?.error, adminT("discounts.errors.deleteFailed")));
      return;
    }
    await load();
  }

  const metrics = useMemo(() => {
    const active = discounts.filter((d) => d.is_active).length;
    const expiringSoon = discounts.filter((d) => statusKey(d) === "expiringSoon").length;
    const totalUses = discounts.reduce((acc, d) => acc + (d.used_count ?? 0), 0);
    const mostUsed = [...discounts].sort((a, b) => (b.used_count ?? 0) - (a.used_count ?? 0))[0]?.code ?? adminT("discounts.na");
    return {
      active,
      expiringSoon,
      totalUses,
      mostUsed,
    };
  }, [discounts, adminT]);

  const rows = useMemo(() => {
    const enriched = discounts.map((d) => {
      const key = statusKey(d);
      const status = adminT(`discounts.status.${key}`);
      const used = d.used_count ?? 0;
      const usage =
        d.max_uses != null && d.max_uses > 0
          ? Math.min(100, Math.round((used / d.max_uses) * 100))
          : used > 0
            ? 100
            : 0;
      const remaining = d.max_uses != null ? Math.max(0, d.max_uses - used) : null;
      return { ...d, status, statusKey: key, usage, remaining, used };
    });

    const filtered = enriched.filter((d) => {
      const matchesQuery =
        d.code.toLowerCase().includes(query.toLowerCase()) ||
        typeLabel(d.type).toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return d.statusKey === "active" || d.statusKey === "expiringSoon";
      if (statusFilter === "paused") return d.statusKey === "paused";
      return d.statusKey === "expired";
    });

    filtered.sort((a, b) => {
      if (sortBy === "code") return a.code.localeCompare(b.code);
      if (sortBy === "value") return b.value - a.value;
      if (sortBy === "expires") return (a.valid_until ? new Date(a.valid_until).getTime() : Infinity) - (b.valid_until ? new Date(b.valid_until).getTime() : Infinity);
      return b.used - a.used;
    });

    return filtered;
  }, [discounts, query, sortBy, statusFilter, adminT, typeLabel]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const activePage = Math.min(page, pages);
  const pagedRows = rows.slice((activePage - 1) * pageSize, activePage * pageSize);

  const previewValue =
    builderType === "fixed"
      ? lang === "ar"
        ? `${Number(value || 0).toFixed(0)} جنيه`
        : `EGP ${Number(value || 0).toFixed(0)}`
      : `${Number(value || 0)}%`;
  const previewMin =
    lang === "ar"
      ? `${Number(minOrder || 0)} جنيه`
      : `EGP ${Number(minOrder || 0)}`;
  const previewExpiry = expiry ? new Date(expiry).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : adminT("discounts.noEndDate");

  return (
    <section className="space-y-6 pb-10">
      <header className="admin-panel-surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="admin-panel-scrim" aria-hidden />
        <div className="pointer-events-none absolute -right-14 -top-10 h-40 w-40 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/75 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900">
              <WandSparkles className="h-3.5 w-3.5" />
              {adminT("discounts.eyebrow")}
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
              {adminT("discounts.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-700 sm:text-base">
              {adminT("discounts.subtitle")}
            </p>
          </div>
          <DiscountAiMenu
            label={adminT("discounts.aiQuickActions")}
            onGenerateCode={(c) => {
              setCode(c);
              setStep(2);
            }}
            onSuggestValue={(v) => setValue(v)}
            onFocusExpiring={() => setStatusFilter("active")}
            onPauseExpiring={() => void pauseExpiringSoon()}
          />
        </div>

        <FreeShippingSettingsPanel canWrite />

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { k: adminT("discounts.metrics.active"), v: metrics.active },
            { k: adminT("discounts.metrics.redemptions"), v: metrics.totalUses },
            { k: adminT("discounts.metrics.expiring"), v: metrics.expiringSoon },
            { k: adminT("discounts.metrics.mostUsed"), v: metrics.mostUsed },
          ].map((item) => (
            <article key={item.k} className="rounded-2xl border border-cb-border/70 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-stone-600">{item.k}</p>
              <p className="mt-2 font-serif text-2xl font-bold text-stone-950">{item.v}</p>
            </article>
          ))}
        </div>
      </header>

      {success ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <form onSubmit={(e) => void createDiscount(e)} className="rounded-3xl border border-cb-border bg-white/95 p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition",
                  step === s
                    ? "bg-cb-terracotta-dark text-white"
                    : "border border-cb-border bg-white text-stone-700",
                )}
              >
                {adminT("discounts.step", { n: s })}
              </button>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-stone-900">{adminT("discounts.step1Title")}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {typeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBuilderType(opt.id)}
                    className={cn(
                      "group rounded-2xl border p-4 text-left transition",
                      builderType === opt.id
                        ? "border-amber-400 bg-amber-50/80 shadow-[0_8px_24px_-18px_rgba(230,126,34,0.6)]"
                        : "border-cb-border bg-white hover:-translate-y-0.5 hover:bg-amber-50/40",
                    )}
                  >
                    <opt.icon className="h-5 w-5 text-amber-700" />
                    <p className="mt-2 text-sm font-bold text-stone-900">{opt.label}</p>
                    <p className="text-xs text-stone-700">{opt.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-stone-900">{adminT("discounts.step2Title")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wide text-stone-700 sm:col-span-2">
                  {adminT("discounts.fields.code")}
                  <div className="mt-1 flex gap-2">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      required
                      placeholder="COOKIE15"
                      className="min-w-0 flex-1 rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none ring-amber-200 transition focus:ring-2"
                    />
                    <button
                      type="button"
                      onClick={() => setCode(`COOKIE${Math.random().toString(36).slice(2, 6).toUpperCase()}`)}
                      className="shrink-0 rounded-2xl border border-cb-border bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950"
                    >
                      {adminT("discounts.generateCode")}
                    </button>
                  </div>
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-700">
                  {adminT("discounts.fields.value")}
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 w-full rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none ring-amber-200 transition focus:ring-2"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-700">
                  {adminT("discounts.fields.maxUses")}
                  <input
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    type="number"
                    min={1}
                    placeholder="500"
                    className="mt-1 w-full rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none ring-amber-200 transition focus:ring-2"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-700">
                  {adminT("discounts.fields.expiry")}
                  <input
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    type="date"
                    className="mt-1 w-full rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none ring-amber-200 transition focus:ring-2"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-700">
                  {adminT("discounts.fields.minOrder")}
                  <input
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none ring-amber-200 transition focus:ring-2"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-700">
                  {adminT("discounts.fields.campaignTag")}
                  <input
                    value={campaignTag}
                    onChange={(e) => setCampaignTag(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none ring-amber-200 transition focus:ring-2"
                  />
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-stone-900">{adminT("discounts.step3Title")}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-stone-700">{adminT("discounts.conditionMode")}</span>
                {(["AND", "OR"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRuleMode(mode)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-bold",
                      ruleMode === mode
                        ? "bg-cb-terracotta-dark text-white"
                        : "border border-cb-border bg-white text-stone-700",
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {ruleOptions.map((rule) => (
                  <button
                    key={rule.key}
                    type="button"
                    onClick={() =>
                      setSelectedRules((prev) =>
                        prev.includes(rule.key) ? prev.filter((r) => r !== rule.key) : [...prev, rule.key],
                      )
                    }
                    className={cn(
                      "rounded-2xl border p-3 text-left text-sm transition",
                      selectedRules.includes(rule.key)
                        ? "border-amber-400 bg-amber-50 text-amber-900"
                        : "border-cb-border bg-white text-stone-700",
                    )}
                  >
                    {rule.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-cb-border/70 pt-4">
            <button
              type="submit"
              disabled={creating}
              className="rounded-2xl bg-[#E67E22] px-4 py-2 text-sm font-bold text-white shadow-[0_8px_24px_-14px_rgba(230,126,34,0.65)] transition hover:-translate-y-0.5 hover:bg-[#d46d16] disabled:opacity-60"
            >
              {creating ? adminT("discounts.creating") : adminT("discounts.create")}
            </button>
            <button
              type="button"
              onClick={() => setCode((prev) => `${prev || "COOKIE"}-COPY`)}
              className="inline-flex items-center gap-1 rounded-2xl border border-cb-border bg-white px-4 py-2 text-sm font-semibold text-stone-800"
            >
              <Copy className="h-4 w-4" />
              {adminT("discounts.cloneDraft")}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-2xl border border-cb-border bg-white px-4 py-2 text-sm font-semibold text-stone-800"
            >
              {adminT("discounts.refreshData")}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <aside className="rounded-3xl border border-cb-border bg-white/95 p-5 shadow-sm">
            <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900">
              <Brain className="h-5 w-5 text-amber-700" />
              {adminT("discounts.aiAssistant")}
            </h3>
            <div className="mt-3 space-y-2">
              {aiHints.map((msg) => (
                <p key={msg} className="rounded-2xl border border-cb-border bg-white/90 px-3 py-2 text-xs text-stone-800">
                  {msg}
                </p>
              ))}
            </div>
          </aside>

          <aside className="rounded-3xl border border-cb-border bg-white/95 p-5 shadow-sm">
            <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900">
              <Ticket className="h-5 w-5 text-amber-700" />
              {adminT("discounts.previewTitle")}
            </h3>
            <div className="mt-4 rounded-2xl border border-cb-border bg-[#FFF6EE] p-4 text-stone-900">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-700">{adminT("discounts.couponCard")}</p>
              <p className="mt-1 font-serif text-2xl font-bold text-stone-950">{code || "YOUR-CODE"}</p>
              <p className="text-sm text-stone-800">
                {adminT("discounts.previewOff", { value: previewValue, min: previewMin })}
              </p>
              <p className="mt-1 text-xs text-stone-700">{adminT("discounts.previewExpires", { date: previewExpiry })}</p>
              <div className="mt-3 flex gap-2">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  {campaignTag}
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                  {adminT("discounts.previewRules", { mode: ruleMode, count: selectedRules.length })}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <section className="rounded-3xl border border-cb-border bg-white/95 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-bold text-stone-900">{adminT("discounts.listTitle")}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-2xl border border-cb-border bg-white px-3 py-2">
              <Search className="h-4 w-4 text-stone-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={adminT("discounts.searchPlaceholder")}
                className="w-44 bg-transparent text-sm outline-none"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm"
            >
              <option value="all">{adminT("discounts.filterAll")}</option>
              <option value="active">{adminT("discounts.filterActive")}</option>
              <option value="paused">{adminT("discounts.filterPaused")}</option>
              <option value="expired">{adminT("discounts.filterExpired")}</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm"
            >
              <option value="performance">{adminT("discounts.sortPerformance")}</option>
              <option value="code">{adminT("discounts.sortCode")}</option>
              <option value="value">{adminT("discounts.sortValue")}</option>
              <option value="expires">{adminT("discounts.sortExpires")}</option>
            </select>
            <ImportExportToolbar
              module="discounts"
              showHistory={false}
              buttonClassName="inline-flex items-center gap-1 rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm font-semibold text-stone-800"
              onImportSuccess={() => void load()}
            />
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-1 rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm font-semibold text-stone-800"
            >
              <Filter className="h-4 w-4" />
              {adminT("discounts.exportOnly")}
            </button>
          </div>
        </div>

        <div className="admin-table-scroll mt-4 rounded-2xl border border-cb-border bg-white/90">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="sticky top-0 border-b border-cb-border bg-cb-surface-2/90 text-left text-xs font-bold uppercase tracking-wide text-stone-700">
              <tr>
                <th className="px-4 py-3">{adminT("discounts.colCode")}</th>
                <th className="px-4 py-3">{adminT("discounts.colType")}</th>
                <th className="px-4 py-3">{adminT("discounts.colStatus")}</th>
                <th className="px-4 py-3">{adminT("discounts.colUses")}</th>
                <th className="px-4 py-3">{adminT("discounts.usagePct")}</th>
                <th className="px-4 py-3">{adminT("discounts.remaining")}</th>
                <th className="px-4 py-3">{adminT("discounts.colExpires")}</th>
                <th className="px-4 py-3">{adminT("discounts.fields.minOrder")}</th>
                <th className="px-4 py-3">{adminT("discounts.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-5 text-stone-700" colSpan={10}>
                    {adminT("discounts.loading")}
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-stone-700" colSpan={10}>
                    {adminT("discounts.empty")}
                  </td>
                </tr>
              ) : (
                pagedRows.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={cn(
                      "border-t border-cb-border transition hover:bg-cb-hover-overlay/60",
                      idx % 2 === 0 ? "bg-transparent" : "bg-cb-surface/30",
                    )}
                  >
                    <td className="px-4 py-3 font-bold text-stone-900">
                      <button
                        type="button"
                        className="hover:text-amber-800"
                        onClick={() => copyCode(d.code)}
                        title={adminT("discounts.copyCode")}
                      >
                        {d.code}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-stone-800">
                      {kindLabel(d)} — {d.type === "percent" ? `${d.value}%` : `EGP ${d.value}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-1 text-[11px] font-bold", statusClass(d.statusKey))}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-800">{d.used}</td>
                    <td className="px-4 py-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-stone-200">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${d.usage}%` }} />
                      </div>
                      <span className="text-xs text-stone-700">{d.usage}%</span>
                    </td>
                    <td className="px-4 py-3 text-stone-800">{d.remaining == null ? adminT("discounts.unlimited") : d.remaining}</td>
                    <td className="px-4 py-3 text-stone-800">
                      {d.valid_until ? new Date(d.valid_until).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : adminT("discounts.noEndDate")}
                    </td>
                    <td className="px-4 py-3 text-stone-800">
                      {lang === "ar" ? `${d.min_order_amount_egp ?? 0} جنيه` : `EGP ${d.min_order_amount_egp ?? 0}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setEditTarget(d)}
                          className="rounded-lg border border-cb-border px-2 py-1 text-[11px] font-bold text-stone-800"
                        >
                          <Pencil className="inline h-3 w-3" /> {adminT("discounts.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void duplicateDiscount(d)}
                          className="rounded-lg border border-cb-border px-2 py-1 text-[11px] font-bold text-stone-800"
                        >
                          <Copy className="inline h-3 w-3" /> {adminT("discounts.duplicate")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleActive(d)}
                          className="rounded-lg border border-cb-border px-2 py-1 text-[11px] font-bold text-stone-800"
                        >
                          {d.is_active ? adminT("discounts.pause") : adminT("discounts.activate")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteDiscount(d)}
                          className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700"
                        >
                          {adminT("discounts.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-stone-700">
            {adminT("discounts.showing", {
              from: (activePage - 1) * pageSize + 1,
              to: Math.min(activePage * pageSize, rows.length),
              total: rows.length,
            })}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-cb-border bg-white px-3 py-1.5 text-xs font-bold text-stone-700"
            >
              {adminT("discounts.prev")}
            </button>
            <span className="text-xs font-bold text-stone-700">
              {activePage} / {pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="rounded-xl border border-cb-border bg-white px-3 py-1.5 text-xs font-bold text-stone-700"
            >
              {adminT("discounts.next")}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          {
            title: adminT("discounts.cardRedemptions"),
            value: String(metrics.totalUses),
            note: adminT("discounts.cardRedemptionsNote"),
            icon: CircleDollarSign,
          },
          {
            title: adminT("discounts.cardActive"),
            value: String(metrics.active),
            note: adminT("discounts.cardActiveNote"),
            icon: Clock3,
          },
          {
            title: adminT("discounts.cardExpiring"),
            value: metrics.expiringSoon > 0 ? `${metrics.expiringSoon}` : adminT("discounts.cardExpiringNone"),
            note: adminT("discounts.cardExpiringNote"),
            icon: Brain,
          },
        ].map((card) => (
          <article key={card.title} className="rounded-3xl border border-cb-border bg-white/95 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{card.title}</p>
              <card.icon className="h-4 w-4 text-amber-700" />
            </div>
            <p className="mt-3 font-serif text-3xl font-bold text-stone-950">{card.value}</p>
            <p className="text-sm text-stone-700">{card.note}</p>
          </article>
        ))}
      </section>

      <DiscountEditModal
        discount={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setSuccess(adminT("discounts.savedSuccess"));
          void load();
        }}
        adminT={adminT}
        apiErr={apiErr}
      />

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} module="discounts" />
    </section>
  );
}

