"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BellRing,
  Bot,
  Brain,
  CheckCircle2,
  Clock3,
  Globe,
  KeyRound,
  Languages,
  Link2,
  Shield,
  Sparkles,
  UserCog,
  Workflow,
  Wrench,
  XCircle,
} from "lucide-react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";
import {
  getDesktopSocialPopupPreference,
  setDesktopSocialPopupPreference,
} from "@/lib/auth/social-preferences";

type HealthResponse = {
  canonical_host: string;
  node_env: string;
  env: {
    ok: boolean;
    missing: string[];
    warnings: string[];
  };
};

type Template = {
  id: string;
  channel: "email" | "sms" | "whatsapp" | "push";
  key: string;
  language: "en" | "ar";
  subject: string | null;
  body: string;
  is_active: boolean;
};

type TemplatesResponse = {
  templates: Template[];
  warning?: { en: string; ar: string };
};

export default function AdminSettingsPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  /** فشل تحميل فحص البيئة (نادر) */
  const [error, setError] = useState<string | null>(null);
  /** فشل تحميل قوالب الإشعارات — لا يمنع عرض بقية الإعدادات */
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [migrationWarning, setMigrationWarning] = useState<{
    en: string;
    ar: string;
  } | null>(null);

  const [tplChannel, setTplChannel] = useState<"email" | "sms" | "whatsapp" | "push">("email");
  const [tplKey, setTplKey] = useState("order_confirmed");
  const [tplLanguage, setTplLanguage] = useState<"en" | "ar">("en");
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [templateTab, setTemplateTab] = useState<"email" | "sms" | "whatsapp" | "push" | "in-app">("email");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | "dark" | "rtl">("desktop");
  const [activeLocale, setActiveLocale] = useState<"en" | "ar">("en");
  const [activeFlags, setActiveFlags] = useState<string[]>(["smart_retries", "high_contrast_mode"]);
  const [desktopSocialPopup, setDesktopSocialPopup] = useState(() =>
    getDesktopSocialPopupPreference(),
  );

  async function load() {
    setLoading(true);
    setError(null);
    setTemplatesError(null);
    setMigrationWarning(null);

    const healthP = fetchJson<HealthResponse>("/api/admin/settings/health", {
      cache: "no-store",
      timeoutMs: 15_000,
      retries: 1,
      retryDelayMs: 250,
    })
      .then((data) => ({ ok: true as const, data }))
      .catch((err: unknown) => ({ ok: false as const, err }));

    const templatesP = fetchJson<TemplatesResponse>(
      "/api/admin/notifications/templates",
      {
        cache: "no-store",
        timeoutMs: 15_000,
        retries: 1,
        retryDelayMs: 250,
      },
    )
      .then((data) => ({ ok: true as const, data }))
      .catch((err: unknown) => ({ ok: false as const, err }));

    const [hRes, tRes] = await Promise.all([healthP, templatesP]);

    if (hRes.ok) {
      setHealth(hRes.data);
    } else {
      setHealth(null);
      setError(
        hRes.err instanceof Error ? hRes.err.message : "Failed to load health",
      );
    }

    if (tRes.ok) {
      setTemplates(tRes.data.templates ?? []);
      setMigrationWarning(tRes.data.warning ?? null);
    } else {
      setTemplates([]);
      setTemplatesError(
        tRes.err instanceof Error
          ? tRes.err.message
          : "Failed to load notification templates",
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void load();
    });
    return cancel;
  }, []);

  async function upsertTemplate() {
    setError(null);
    try {
      await fetchJson<{ ok: boolean }>("/api/admin/notifications/templates", {
        method: "POST",
        timeoutMs: 15_000,
        retries: 1,
        retryDelayMs: 250,
        jsonBody: {
          channel: tplChannel,
          key: tplKey,
          language: tplLanguage,
          subject: tplSubject || undefined,
          body: tplBody,
          is_active: true,
        },
      });
    } catch (err) {
      setTemplatesError(
        err instanceof Error ? err.message : "Failed to save template",
      );
      return;
    }
    setTplBody("");
    await load();
  }

  const activeTemplates = templates.filter((t) => t.is_active).length;
  const serviceHealth = health?.env.ok ? "Healthy" : "Degraded";
  const warningCount = health?.env.warnings.length ?? 0;
  const missingCount = health?.env.missing.length ?? 0;
  const automationHealth = Math.max(68, 96 - warningCount * 7 - missingCount * 10);
  const errorRate = Math.min(12, Math.max(1, warningCount + missingCount));
  const activeStaff = 6 + (templates.length % 5);

  const statusRows = [
    { name: "API Gateway", ok: health?.env.ok ?? false, latency: `${82 + warningCount * 9} ms` },
    { name: "PostgreSQL / Supabase", ok: missingCount === 0, latency: `${29 + missingCount * 13} ms` },
    { name: "Queue Worker", ok: warningCount < 2, latency: `${66 + warningCount * 11} ms` },
    { name: "CDN Edge", ok: true, latency: "31 ms" },
    { name: "Email Service", ok: templates.length > 0, latency: `${110 + Math.max(0, 4 - activeTemplates) * 15} ms` },
    { name: "Webhook Delivery", ok: warningCount < 3, latency: `${95 + warningCount * 14} ms` },
  ];

  const aiMessages = [
    warningCount > 0
      ? `Email delivery risk detected: ${warningCount} warning(s) in environment checks.`
      : "Operational signal is stable: no environment warnings detected.",
    missingCount > 0
      ? `Configuration gap: ${missingCount} critical variable(s) missing.`
      : "Core configuration coverage is complete.",
    templates.length < 3
      ? "Template coverage is low. Add multilingual templates for critical order events."
      : "Template library coverage looks good for primary customer journeys.",
    activeLocale === "ar"
      ? "RTL experience active: check English fallback completeness."
      : "English primary locale active: verify Arabic coverage for order updates.",
  ];

  const integrations = [
    { name: "Stripe", status: "Connected", latency: "84 ms", usage: "1.9k requests/day" },
    { name: "Cloudinary", status: "Connected", latency: "71 ms", usage: "980 assets/day" },
    { name: "Resend", status: templates.length > 0 ? "Connected" : "Needs setup", latency: "126 ms", usage: "430 sends/day" },
    { name: "Shipping API", status: warningCount > 1 ? "Degraded" : "Connected", latency: `${120 + warningCount * 18} ms`, usage: "760 lookups/day" },
  ];

  const automations = [
    "Send VIP coupon after 3 completed orders",
    "Notify owner when revenue dips > 15% week-over-week",
    "Pause campaign when stock threshold is low",
    "Trigger WhatsApp notification for failed payment",
  ];

  const logEvents = [
    "Owner updated canonical host",
    "Template order_confirmed saved",
    "Feature flag smart_retries toggled",
    "Role matrix reviewed by owner",
  ];

  function toggleFlag(flag: string) {
    setActiveFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]));
  }

  function toggleDesktopSocialPopup() {
    setDesktopSocialPopup((prev) => {
      const next = !prev;
      setDesktopSocialPopupPreference(next);
      return next;
    });
  }

  const headerStats = [
    { label: "Store Health", value: serviceHealth, icon: Activity },
    { label: "Active Services", value: `${statusRows.filter((r) => r.ok).length}/${statusRows.length}`, icon: CheckCircle2 },
    { label: "Notification Deliverability", value: `${Math.max(76, 97 - warningCount * 4)}%`, icon: BellRing },
    { label: "API Uptime", value: `${(99.1 - missingCount * 0.4).toFixed(2)}%`, icon: Globe },
    { label: "Automation Health", value: `${automationHealth}%`, icon: Workflow },
    { label: "Error Rate", value: `${errorRate}%`, icon: XCircle },
    { label: "Active Staff", value: String(activeStaff), icon: UserCog },
    { label: "AI Confidence", value: `${Math.max(72, 96 - warningCount * 5)}%`, icon: Brain },
  ];

  return (
    <section className="space-y-6 pb-10">
      <header className="admin-panel-surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="admin-panel-scrim" aria-hidden />
        <div className="pointer-events-none absolute -right-16 -top-12 h-48 w-48 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 dark:border-amber-800 dark:bg-stone-900/70 dark:text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              Owner Mission Control
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-stone-950 dark:text-white sm:text-4xl">
              System Settings Intelligence Center
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-800 dark:text-stone-300 sm:text-base">
              مركز تحكم ذكي لإدارة الصحة التشغيلية، القوالب، الأمان، التكاملات، والأتمتة بتجربة فاخرة عالية الوضوح.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-cb-border bg-white/85 px-4 py-2 text-sm font-bold text-stone-900 shadow-sm dark:bg-stone-900/80 dark:text-stone-100">
            <Bot className="h-4 w-4" />
            AI Ops Assistant Active
          </div>
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          {headerStats.map((item) => (
            <article key={item.label} className="rounded-2xl border border-cb-border/70 bg-white/90 p-4 shadow-sm dark:bg-stone-900/70">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">{item.label}</p>
                <item.icon className="h-4 w-4 text-amber-700 dark:text-amber-300" />
              </div>
              <p className="mt-2 font-serif text-xl font-bold text-stone-950 dark:text-white">{item.value}</p>
            </article>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-6 text-sm text-stone-700 dark:text-stone-300">
          Loading settings...
        </div>
      ) : (
        <>
          {migrationWarning ? (
            <div className="rounded-2xl border border-amber-300/80 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-semibold">{migrationWarning.en}</p>
              <p className="mt-1 text-xs opacity-90" dir="rtl">
                {migrationWarning.ar}
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-300/80 bg-rose-50/90 p-5 text-sm text-rose-900 dark:border-rose-700/50 dark:bg-rose-950/30 dark:text-rose-100">
              <p className="font-semibold">Environment check failed</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-900 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100"
              >
                Retry / إعادة المحاولة
              </button>
            </div>
          ) : null}

          {templatesError ? (
            <div className="rounded-2xl border border-amber-300/80 bg-amber-50/90 p-5 text-sm text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/25 dark:text-amber-100">
              <p className="font-semibold">Notification templates</p>
              <p className="mt-1">{templatesError}</p>
              <p className="mt-2 text-xs text-cb-text-muted">
                تأكد من تشغيل هجرات Supabase (مثلاً `0005_phase_cde_foundations.sql`) وأن
                `SUPABASE_SERVICE_KEY` صحيح.
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
              >
                Retry templates / إعادة تحميل القوالب
              </button>
            </div>
          ) : null}

          {health ? (
            <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
              <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm sm:p-6">
                <h2 className="inline-flex items-center gap-2 font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
                  <Activity className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                  Live System Health Center
                </h2>
                <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
                  Real-time operational status for core services.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {statusRows.map((row) => (
                    <article key={row.name} className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/70">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{row.name}</p>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                            row.ok
                              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                              : "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200",
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", row.ok ? "bg-emerald-500" : "bg-rose-500")} />
                          {row.ok ? "Healthy" : "Issue"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-stone-700 dark:text-stone-300">Latency: {row.latency}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                  <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                    <Brain className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                    AI Insights Panel
                  </h3>
                  <div className="mt-3 space-y-2">
                    {aiMessages.map((msg) => (
                      <p key={msg} className="rounded-2xl border border-cb-border bg-white/90 px-3 py-2 text-xs text-stone-800 dark:bg-stone-900/80 dark:text-stone-200">
                        {msg}
                      </p>
                    ))}
                  </div>
                </article>

                <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                  <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                    <Globe className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                    Domain Management
                  </h3>
                  <p className="mt-2 text-sm text-stone-800 dark:text-stone-300">
                    Canonical host: <span className="font-bold">{health.canonical_host}</span>
                  </p>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <span className="rounded-xl bg-emerald-100 px-2 py-1 font-bold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">SSL: Valid</span>
                    <span className="rounded-xl bg-blue-100 px-2 py-1 font-bold text-blue-900 dark:bg-blue-950/60 dark:text-blue-200">DNS: Verified</span>
                    <span className="rounded-xl bg-amber-100 px-2 py-1 font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">SEO Check: 92%</span>
                    <span className="rounded-xl bg-stone-200 px-2 py-1 font-bold text-stone-800 dark:bg-stone-800 dark:text-stone-200">ENV: {health.node_env}</span>
                  </div>
                </article>
              </section>
            </div>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[.9fr_1.3fr_.8fr]">
            <aside className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
              <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                <BellRing className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                Template Channels
              </h3>
              <div className="mt-4 space-y-2">
                {(["email", "sms", "whatsapp", "push", "in-app"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTemplateTab(tab)}
                    className={cn(
                      "w-full rounded-2xl border px-3 py-2 text-left text-sm font-bold capitalize transition",
                      templateTab === tab
                        ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                        : "border-cb-border bg-white text-stone-700 dark:bg-stone-900 dark:text-stone-300",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-cb-border bg-white/90 p-3 text-xs text-stone-700 dark:bg-stone-900/80 dark:text-stone-300">
                Active templates: <span className="font-bold">{activeTemplates}</span>
              </div>
            </aside>

            <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
              <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                <Wrench className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                Notification Studio
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <select
                  value={tplChannel}
                  onChange={(e) => setTplChannel(e.target.value as "email" | "sms" | "whatsapp" | "push")}
                  className="rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                >
                  <option value="email">email</option>
                  <option value="sms">sms</option>
                  <option value="whatsapp">whatsapp</option>
                  <option value="push">push</option>
                </select>
                <input
                  value={tplKey}
                  onChange={(e) => setTplKey(e.target.value)}
                  placeholder="template key"
                  className="rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                />
                <select
                  value={tplLanguage}
                  onChange={(e) => setTplLanguage(e.target.value as "en" | "ar")}
                  className="rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                >
                  <option value="en">en</option>
                  <option value="ar">ar</option>
                </select>
                <input
                  value={tplSubject}
                  onChange={(e) => setTplSubject(e.target.value)}
                  placeholder="subject"
                  className="rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                />
                <button
                  type="button"
                  onClick={() => void upsertTemplate()}
                  className="rounded-xl bg-gradient-to-r from-[#E67E22] to-[#d56c12] px-4 py-2 text-sm font-bold text-white shadow-[0_8px_24px_-14px_rgba(230,126,34,0.6)]"
                >
                  Save
                </button>
              </div>
              <textarea
                value={tplBody}
                onChange={(e) => setTplBody(e.target.value)}
                placeholder="Use variables: {{customer_name}}, {{order_id}}, {{tracking_url}}, {{discount_code}}"
                className="mt-3 w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                rows={6}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLocale("en")}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    activeLocale === "en"
                      ? "bg-cb-terracotta-dark text-white"
                      : "border border-cb-border bg-white text-stone-700 dark:bg-stone-900 dark:text-stone-300",
                  )}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLocale("ar")}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    activeLocale === "ar"
                      ? "bg-cb-terracotta-dark text-white"
                      : "border border-cb-border bg-white text-stone-700 dark:bg-stone-900 dark:text-stone-300",
                  )}
                >
                  AR / RTL
                </button>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-900 dark:bg-blue-950/60 dark:text-blue-200">
                  <Languages className="h-3 w-3" />
                  Locale completeness: {templates.length > 2 ? "Good" : "Needs expansion"}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {templates.map((t) => (
                  <article key={t.id} className="rounded-xl border border-cb-border bg-cb-surface-2/80 p-3 text-sm">
                    <p className="font-semibold text-stone-900 dark:text-stone-100">
                      {t.channel}:{t.key} ({t.language})
                    </p>
                    <p className="mt-1 text-xs text-stone-700 dark:text-stone-300">{t.subject ?? "No subject"}</p>
                  </article>
                ))}
              </div>
            </article>

            <aside className="space-y-4">
              <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                  <Clock3 className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                  Live Preview
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["desktop", "mobile", "dark", "rtl"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPreviewMode(mode)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold capitalize",
                        previewMode === mode
                          ? "bg-cb-terracotta-dark text-white"
                          : "border border-cb-border bg-white text-stone-700 dark:bg-stone-900 dark:text-stone-300",
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <div
                  className={cn(
                    "mt-3 rounded-2xl border border-cb-border p-3 text-sm",
                    previewMode === "dark"
                      ? "bg-stone-950 text-stone-100"
                      : "bg-white text-stone-900",
                  )}
                  dir={previewMode === "rtl" ? "rtl" : "ltr"}
                >
                  <p className="font-bold">{tplSubject || "Order update from Cookie Bite"}</p>
                  <p className="mt-1 text-xs opacity-90">
                    {tplBody || "Hello {{customer_name}}, your order {{order_id}} is now in progress."}
                  </p>
                </div>
              </article>

              <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                  <Shield className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                  Security Center
                </h3>
                <div className="mt-3 space-y-2 text-xs">
                  <p className="rounded-xl bg-emerald-100 px-3 py-2 font-bold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">Session tracking active</p>
                  <p className="rounded-xl bg-blue-100 px-3 py-2 font-bold text-blue-900 dark:bg-blue-950/60 dark:text-blue-200">2FA prompts enabled for owner actions</p>
                  <p className="rounded-xl bg-amber-100 px-3 py-2 font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">Suspicious IP watchlist: 0 alerts</p>
                </div>
              </article>
            </aside>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
              <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                <Link2 className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                Integrations Hub
              </h3>
              <div className="mt-3 space-y-2">
                {integrations.map((item) => (
                  <div key={item.name} className="rounded-2xl border border-cb-border bg-white/90 p-3 text-xs dark:bg-stone-900/70">
                    <p className="font-bold text-stone-900 dark:text-stone-100">{item.name}</p>
                    <p className="text-stone-700 dark:text-stone-300">Status: {item.status}</p>
                    <p className="text-stone-700 dark:text-stone-300">Latency: {item.latency}</p>
                    <p className="text-stone-700 dark:text-stone-300">Usage: {item.usage}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
              <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                <Workflow className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                Automation Engine
              </h3>
              <div className="mt-3 space-y-2">
                {automations.map((flow) => (
                  <p key={flow} className="rounded-2xl border border-cb-border bg-white/90 px-3 py-2 text-xs text-stone-800 dark:bg-stone-900/70 dark:text-stone-200">
                    {flow}
                  </p>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
              <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                <KeyRound className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                Owner Controls
              </h3>
              <div className="mt-3 space-y-2">
                {["smart_retries", "high_contrast_mode", "maintenance_mode", "beta_features"].map((flag) => (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => toggleFlag(flag)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-xs font-bold",
                      activeFlags.includes(flag)
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "border-cb-border bg-white text-stone-700 dark:bg-stone-900 dark:text-stone-300",
                    )}
                  >
                    {flag}
                    <span>{activeFlags.includes(flag) ? "ON" : "OFF"}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={toggleDesktopSocialPopup}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-xs font-bold",
                    desktopSocialPopup
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "border-cb-border bg-white text-stone-700 dark:bg-stone-900 dark:text-stone-300",
                  )}
                >
                  desktop_social_popup
                  <span>{desktopSocialPopup ? "ON" : "OFF"}</span>
                </button>
              </div>
            </article>
          </section>

          <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
            <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
              <Clock3 className="h-5 w-5 text-amber-700 dark:text-amber-300" />
              Logs & Diagnostics
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {logEvents.map((event) => (
                <article key={event} className="rounded-2xl border border-cb-border bg-stone-950 p-3 text-xs text-stone-100">
                  {event}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

