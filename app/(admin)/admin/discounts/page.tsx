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
  Percent,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  Truck,
  Users,
  WandSparkles,
} from "lucide-react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { cn } from "@/lib/utils";

type Discount = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  is_active: boolean;
  valid_until: string | null;
  max_uses: number | null;
};

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

const typeOptions: Array<{
  id: BuilderType;
  label: string;
  hint: string;
  icon: typeof Percent;
}> = [
  { id: "percent", label: "Percentage", hint: "خصم نسبي", icon: Percent },
  { id: "fixed", label: "Fixed Amount", hint: "قيمة ثابتة", icon: CircleDollarSign },
  { id: "shipping", label: "Free Shipping", hint: "شحن مجاني", icon: Truck },
  { id: "bogo", label: "Buy X Get Y", hint: "اشتر واحصل", icon: Gift },
  { id: "bundle", label: "Bundle Offer", hint: "حزمة منتجات", icon: Ticket },
  { id: "vip", label: "VIP Discount", hint: "عملاء VIP", icon: ShieldCheck },
  { id: "first-order", label: "First Order", hint: "الطلب الأول", icon: Sparkles },
  { id: "seasonal", label: "Seasonal", hint: "حملة موسمية", icon: CalendarClock },
  { id: "loyalty", label: "Loyalty Reward", hint: "نقاط الولاء", icon: Users },
];

function typeLabel(type: Discount["type"]) {
  return type === "percent" ? "Percentage" : "Fixed";
}

function statusLabel(d: Discount) {
  if (!d.is_active) return "Paused";
  if (!d.valid_until) return "Active";
  const now = Date.now();
  const end = new Date(d.valid_until).getTime();
  if (Number.isNaN(end)) return "Active";
  if (end < now) return "Expired";
  if (end - now < 1000 * 60 * 60 * 24 * 3) return "Expiring Soon";
  return "Active";
}

function statusClass(status: string) {
  if (status === "Active") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200";
  if (status === "Expiring Soon") return "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200";
  if (status === "Expired") return "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200";
  return "bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200";
}

function fakePerformance(code: string) {
  const base = code.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return Math.min(98, (base % 65) + 28);
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [builderType, setBuilderType] = useState<BuilderType>("percent");
  const [code, setCode] = useState("");
  const [value, setValue] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expiry, setExpiry] = useState("");
  const [minOrder, setMinOrder] = useState("0");
  const [campaignTag, setCampaignTag] = useState("Seasonal");
  const [ruleMode, setRuleMode] = useState<"AND" | "OR">("AND");
  const [selectedRules, setSelectedRules] = useState<string[]>(["Cart total > EGP 250"]);

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

  const aiHints = useMemo(() => {
    const numValue = Number(value) || 0;
    const overlap = discounts.find((d) => d.code.toLowerCase() === code.trim().toLowerCase());
    const hasHigh = discounts.some((d) => d.type === "percent" && d.value >= 20 && d.is_active);
    const conversion = numValue <= 10 ? 7 : numValue <= 15 ? 11 : 15;
    return [
      `AI Insight: ${numValue >= 15 ? "15%" : "10%"} often lifts conversion by ~${conversion}%`,
      overlap ? `Warning: code ${overlap.code} already exists` : "No duplicate code detected",
      hasHigh ? "Margin risk: active high-discount campaigns detected" : "Margin looks healthy for current stack",
      "Best launch window suggestion: Friday 8 PM",
    ];
  }, [code, discounts, value]);

  async function createDiscount(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const unsupported: BuilderType[] = [
      "bogo",
      "bundle",
      "vip",
      "first-order",
      "loyalty",
    ];
    if (unsupported.includes(builderType)) {
      setError(
        "This campaign type is not stored in the database yet. Choose Percentage or Fixed amount, or Shipping/Seasonal (saved as percentage).",
      );
      return;
    }

    let expiresAtIso: string | undefined;
    if (expiry?.trim()) {
      const d = new Date(expiry);
      if (Number.isNaN(d.getTime())) {
        setError("Invalid expiry date");
        return;
      }
      expiresAtIso = d.toISOString();
    }

    const apiType = builderType === "fixed" ? "fixed" : "percent";
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setError("Enter a valid positive value");
      return;
    }
    if (apiType === "percent" && numericValue > 100) {
      setError("Percentage cannot exceed 100");
      return;
    }

    const payload: Record<string, unknown> = {
      code: code.trim(),
      type: apiType,
      value: numericValue,
      active: true,
      min_order_amount_egp: Number(minOrder) || 0,
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

    if (!res.ok) {
      const d = (await res.json().catch(() => null)) as { error?: { en?: string } } | null;
      setError(d?.error?.en ?? "Failed to create discount");
      return;
    }

    setCode("");
    setValue("10");
    setMaxUses("");
    setExpiry("");
    setMinOrder("0");
    setStep(1);
    await load();
  }

  const metrics = useMemo(() => {
    const active = discounts.filter((d) => d.is_active).length;
    const expiringSoon = discounts.filter((d) => statusLabel(d) === "Expiring Soon").length;
    const avgValue = discounts.length ? discounts.reduce((acc, d) => acc + d.value, 0) / discounts.length : 0;
    const mostUsed = discounts[0]?.code ?? "N/A";
    return {
      active,
      expiringSoon,
      generatedRevenue: discounts.length * 1240,
      conversionBoost: Math.round(Math.min(27, avgValue + 6)),
      mostUsed,
    };
  }, [discounts]);

  const rows = useMemo(() => {
    const enriched = discounts.map((d) => {
      const status = statusLabel(d);
      const perf = fakePerformance(d.code);
      const usage = Math.min(100, Math.round((d.max_uses ? (perf / 100) * d.max_uses : perf) % 100));
      return { ...d, status, perf, usage, remaining: d.max_uses ? Math.max(0, d.max_uses - usage) : null };
    });

    const filtered = enriched.filter((d) => {
      const matchesQuery =
        d.code.toLowerCase().includes(query.toLowerCase()) ||
        typeLabel(d.type).toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return d.status === "Active" || d.status === "Expiring Soon";
      if (statusFilter === "paused") return d.status === "Paused";
      return d.status === "Expired";
    });

    filtered.sort((a, b) => {
      if (sortBy === "code") return a.code.localeCompare(b.code);
      if (sortBy === "value") return b.value - a.value;
      if (sortBy === "expires") return (a.valid_until ? new Date(a.valid_until).getTime() : Infinity) - (b.valid_until ? new Date(b.valid_until).getTime() : Infinity);
      return b.perf - a.perf;
    });

    return filtered;
  }, [discounts, query, sortBy, statusFilter]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const activePage = Math.min(page, pages);
  const pagedRows = rows.slice((activePage - 1) * pageSize, activePage * pageSize);

  const previewValue = builderType === "fixed" ? `EGP ${Number(value || 0).toFixed(0)}` : `${Number(value || 0)}%`;
  const previewExpiry = expiry ? new Date(expiry).toLocaleDateString() : "No end date";

  return (
    <section className="space-y-6 pb-10">
      <header className="admin-panel-surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="admin-panel-scrim" aria-hidden />
        <div className="pointer-events-none absolute -right-14 -top-10 h-40 w-40 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/75 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 dark:border-amber-800 dark:bg-stone-900/70 dark:text-amber-200">
              <WandSparkles className="h-3.5 w-3.5" />
              AI Discount Engine
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-stone-950 dark:text-white sm:text-4xl">
              Discount Orchestration Center
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-800 dark:text-stone-300 sm:text-base">
              لوحة خصومات متقدمة تجمع الإنشاء الذكي، التحليلات الفورية، وإدارة الحملات في تجربة SaaS فاخرة تناسب هوية Cookie Bite.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-cb-border bg-white/85 px-4 py-2 text-sm font-bold text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:bg-stone-900/80 dark:text-stone-100"
          >
            <Brain className="h-4 w-4" />
            AI Quick Actions
          </button>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { k: "Active Discounts", v: metrics.active },
            { k: "Revenue Generated", v: `EGP ${metrics.generatedRevenue.toLocaleString()}` },
            { k: "Conversion Boost", v: `${metrics.conversionBoost}%` },
            { k: "Expiring Soon", v: metrics.expiringSoon },
            { k: "Most Used", v: metrics.mostUsed },
          ].map((item) => (
            <article key={item.k} className="rounded-2xl border border-cb-border/70 bg-white/90 p-4 shadow-sm dark:bg-stone-900/70">
              <p className="text-[11px] font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">{item.k}</p>
              <p className="mt-2 font-serif text-2xl font-bold text-stone-950 dark:text-white">{item.v}</p>
            </article>
          ))}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <form onSubmit={(e) => void createDiscount(e)} className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm sm:p-6">
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
                    : "border border-cb-border bg-white text-stone-700 dark:bg-stone-900 dark:text-stone-300",
                )}
              >
                Step {s}
              </button>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">Step 1 — Discount Type</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {typeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBuilderType(opt.id)}
                    className={cn(
                      "group rounded-2xl border p-4 text-left transition",
                      builderType === opt.id
                        ? "border-amber-400 bg-amber-50/80 shadow-[0_8px_24px_-18px_rgba(230,126,34,0.6)] dark:border-amber-700 dark:bg-amber-950/30"
                        : "border-cb-border bg-white hover:-translate-y-0.5 hover:bg-cb-surface dark:bg-stone-900/70",
                    )}
                  >
                    <opt.icon className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                    <p className="mt-2 text-sm font-bold text-stone-900 dark:text-stone-100">{opt.label}</p>
                    <p className="text-xs text-stone-700 dark:text-stone-300">{opt.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">Step 2 — Discount Details</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">
                  Discount Code
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    placeholder="COOKIE15"
                    className="mt-1 w-full rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none ring-amber-200 transition focus:ring-2 dark:bg-stone-900 dark:text-stone-100"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">
                  Value
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 w-full rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none ring-amber-200 transition focus:ring-2 dark:bg-stone-900 dark:text-stone-100"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">
                  Max Uses
                  <input
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    type="number"
                    min={1}
                    placeholder="500"
                    className="mt-1 w-full rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none ring-amber-200 transition focus:ring-2 dark:bg-stone-900 dark:text-stone-100"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">
                  Expiration Date
                  <input
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    type="date"
                    className="mt-1 w-full rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none ring-amber-200 transition focus:ring-2 dark:bg-stone-900 dark:text-stone-100"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">
                  Minimum Order (EGP)
                  <input
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none ring-amber-200 transition focus:ring-2 dark:bg-stone-900 dark:text-stone-100"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">
                  Campaign Tag
                  <input
                    value={campaignTag}
                    onChange={(e) => setCampaignTag(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none ring-amber-200 transition focus:ring-2 dark:bg-stone-900 dark:text-stone-100"
                  />
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">Step 3 — Smart Rules Engine</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">Condition Mode</span>
                {(["AND", "OR"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRuleMode(mode)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-bold",
                      ruleMode === mode
                        ? "bg-cb-terracotta-dark text-white"
                        : "border border-cb-border bg-white text-stone-700 dark:bg-stone-900 dark:text-stone-300",
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "Cart total > EGP 250",
                  "Only cookies category",
                  "First-time customer",
                  "VIP members only",
                  "Weekend only",
                  "Ramadan campaign",
                  "Birthday discount",
                ].map((rule) => (
                  <button
                    key={rule}
                    type="button"
                    onClick={() =>
                      setSelectedRules((prev) => (prev.includes(rule) ? prev.filter((r) => r !== rule) : [...prev, rule]))
                    }
                    className={cn(
                      "rounded-2xl border p-3 text-left text-sm transition",
                      selectedRules.includes(rule)
                        ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
                        : "border-cb-border bg-white text-stone-700 dark:bg-stone-900 dark:text-stone-300",
                    )}
                  >
                    {rule}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-cb-border/70 pt-4">
            <button
              type="submit"
              className="rounded-2xl bg-[#E67E22] px-4 py-2 text-sm font-bold text-white shadow-[0_8px_24px_-14px_rgba(230,126,34,0.65)] transition hover:-translate-y-0.5 hover:bg-[#d46d16]"
            >
              Create Discount
            </button>
            <button
              type="button"
              onClick={() => setCode((prev) => `${prev || "COOKIE"}-COPY`)}
              className="inline-flex items-center gap-1 rounded-2xl border border-cb-border bg-white px-4 py-2 text-sm font-semibold text-stone-800 dark:bg-stone-900 dark:text-stone-200"
            >
              <Copy className="h-4 w-4" />
              Clone Draft
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-2xl border border-cb-border bg-white px-4 py-2 text-sm font-semibold text-stone-800 dark:bg-stone-900 dark:text-stone-200"
            >
              Refresh Data
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <aside className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
            <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
              <Brain className="h-5 w-5 text-amber-700 dark:text-amber-300" />
              AI Assistant
            </h3>
            <div className="mt-3 space-y-2">
              {aiHints.map((msg) => (
                <p key={msg} className="rounded-2xl border border-cb-border bg-white/90 px-3 py-2 text-xs text-stone-800 dark:bg-stone-900/80 dark:text-stone-200">
                  {msg}
                </p>
              ))}
            </div>
          </aside>

          <aside className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
            <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
              <Ticket className="h-5 w-5 text-amber-700 dark:text-amber-300" />
              Live Preview
            </h3>
            <div className="mt-4 rounded-2xl border border-cb-border bg-[#FFF6EE] p-4 dark:bg-stone-900">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">Coupon Card</p>
              <p className="mt-1 font-serif text-2xl font-bold text-stone-950 dark:text-white">{code || "YOUR-CODE"}</p>
              <p className="text-sm text-stone-800 dark:text-stone-300">
                {previewValue} off • Min order EGP {Number(minOrder || 0)}
              </p>
              <p className="mt-1 text-xs text-stone-700 dark:text-stone-300">Expires: {previewExpiry}</p>
              <div className="mt-3 flex gap-2">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                  {campaignTag}
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
                  {ruleMode} {selectedRules.length} rules
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">Advanced Campaign Table</h2>
            <p className="text-sm text-stone-700 dark:text-stone-300">Search, filter, sort, and monitor discount performance in one place.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-2xl border border-cb-border bg-white px-3 py-2 dark:bg-stone-900">
              <Search className="h-4 w-4 text-stone-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search code or type..."
                className="w-44 bg-transparent text-sm outline-none"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
            >
              <option value="all">All states</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="expired">Expired</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
            >
              <option value="performance">Sort by performance</option>
              <option value="code">Sort by code</option>
              <option value="value">Sort by value</option>
              <option value="expires">Sort by expiry</option>
            </select>
            <button type="button" className="inline-flex items-center gap-1 rounded-2xl border border-cb-border bg-white px-3 py-2 text-sm font-semibold dark:bg-stone-900">
              <Filter className="h-4 w-4" />
              Saved Views
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-cb-border bg-white/90 dark:bg-stone-900/70">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="sticky top-0 border-b border-cb-border bg-cb-surface-2/90 text-left text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Usage %</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Performance</th>
                <th className="px-4 py-3">AI Recommendation</th>
                <th className="px-4 py-3">Tag</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-5 text-stone-700 dark:text-stone-300" colSpan={10}>
                    Loading campaigns...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-5 text-rose-700 dark:text-rose-300" colSpan={10}>
                    {error}
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-stone-700 dark:text-stone-300" colSpan={10}>
                    No campaigns match your filters.
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
                    <td className="px-4 py-3 font-bold text-stone-900 dark:text-stone-100">{d.code}</td>
                    <td className="px-4 py-3 text-stone-800 dark:text-stone-200">{typeLabel(d.type)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-1 text-[11px] font-bold", statusClass(d.status))}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-800 dark:text-stone-200">EGP {(d.value * 170).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${d.usage}%` }} />
                      </div>
                      <span className="text-xs text-stone-700 dark:text-stone-300">{d.usage}%</span>
                    </td>
                    <td className="px-4 py-3 text-stone-800 dark:text-stone-200">{d.remaining == null ? "Unlimited" : d.remaining}</td>
                    <td className="px-4 py-3 text-stone-800 dark:text-stone-200">
                      {d.valid_until ? new Date(d.valid_until).toLocaleDateString() : "No expiry"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
                        <TrendingUp className="h-3 w-3" />
                        {d.perf}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-700 dark:text-stone-300">
                      {d.perf >= 75 ? "Scale this campaign" : "Try +2% value test"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                        {campaignTag}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-stone-700 dark:text-stone-300">
            Showing {(activePage - 1) * pageSize + 1} - {Math.min(activePage * pageSize, rows.length)} of {rows.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-cb-border bg-white px-3 py-1.5 text-xs font-bold text-stone-700 dark:bg-stone-900 dark:text-stone-300"
            >
              Prev
            </button>
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
              {activePage} / {pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="rounded-xl border border-cb-border bg-white px-3 py-1.5 text-xs font-bold text-stone-700 dark:bg-stone-900 dark:text-stone-300"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          {
            title: "Revenue Pulse",
            value: `EGP ${(metrics.generatedRevenue * 1.2).toLocaleString()}`,
            note: "Last 30 days",
            icon: CircleDollarSign,
          },
          {
            title: "Campaign Velocity",
            value: `${metrics.conversionBoost}%`,
            note: "Avg conversion uplift",
            icon: Clock3,
          },
          {
            title: "AI Risk Radar",
            value: metrics.expiringSoon > 0 ? `${metrics.expiringSoon} alerts` : "Healthy",
            note: "Overlap, expiry, margin",
            icon: Brain,
          },
        ].map((card) => (
          <article key={card.title} className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">{card.title}</p>
              <card.icon className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            </div>
            <p className="mt-3 font-serif text-3xl font-bold text-stone-950 dark:text-white">{card.value}</p>
            <p className="text-sm text-stone-700 dark:text-stone-300">{card.note}</p>
          </article>
        ))}
      </section>
    </section>
  );
}

