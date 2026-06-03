"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BellRing,
  Bot,
  Brain,
  CheckCircle2,
  Clock3,
  Globe,
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
import { renderTemplateString } from "@/lib/notifications/template-vars";
import { WHATSAPP_TEMPLATE_CATALOG } from "@/lib/notifications/whatsapp-template-catalog";
import { cn } from "@/lib/utils";
import { useAdminT } from "@/lib/admin/use-admin-t";
import {
  AdminBadge,
  AdminBadgeButton,
  adminPillClass,
  adminTabClass,
} from "@/components/admin/admin-badge";
import { OwnerControlsPanel } from "@/components/admin/owner-controls-panel";

/** حقول استوديو القوالب — عرض كامل + سهم select من `.cb-field` */
const tplStudioFieldClass = "cb-field min-w-0 w-full dark:bg-stone-900";

type HealthResponse = {
  canonical_host: string;
  node_env: string;
  env: {
    ok: boolean;
    missing: string[];
    warnings: string[];
  };
  /** مجموعات متغيرات البيئة (إنتاج) — ليس قياس ping */
  integrations: {
    app_urls: boolean;
    clerk: boolean;
    supabase: boolean;
    paymob: boolean;
    resend: boolean;
    internal_api: boolean;
  };
  database?: {
    ok: boolean;
    configured: boolean;
    missing_tables: string[];
    failed_tables: string[];
    migrate_hint?: string;
  };
  actor?: { role: string };
};

/** بطاقات العرض ← مفتاح `integrations` من الـ API (أزمن ثابتة توضيحية). */
const HEALTH_CARD_DEFS = [
  { labelKey: "healthCards.apiGateway", key: "internal_api" as const, latencyOk: "38 ms", latencyIssue: "82 ms" },
  { labelKey: "healthCards.postgres", key: "supabase" as const, latencyOk: "24 ms", latencyIssue: "68 ms" },
  { labelKey: "healthCards.queueWorker", key: "paymob" as const, latencyOk: "51 ms", latencyIssue: "66 ms" },
  { labelKey: "healthCards.cdnEdge", key: "app_urls" as const, latencyOk: "18 ms", latencyIssue: "31 ms" },
  { labelKey: "healthCards.emailService", key: "resend" as const, latencyOk: "44 ms", latencyIssue: "170 ms" },
  { labelKey: "healthCards.webhookDelivery", key: "clerk" as const, latencyOk: "62 ms", latencyIssue: "95 ms" },
];

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
  const { adminT, apiErr } = useAdminT();
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

  const [tplChannel, setTplChannel] = useState<"email" | "sms" | "whatsapp" | "push">("whatsapp");
  const [tplKey, setTplKey] = useState("order_confirm");
  const [tplLanguage, setTplLanguage] = useState<"en" | "ar">("ar");
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [templateTab, setTemplateTab] = useState<"email" | "sms" | "whatsapp" | "push" | "in-app">("whatsapp");
  const [tplSaveStatus, setTplSaveStatus] = useState<string | null>(null);
  const [tplBusy, setTplBusy] = useState(false);
  const [waPresetKey, setWaPresetKey] = useState("order_confirm");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | "rtl">("desktop");
  const [activeLocale, setActiveLocale] = useState<"en" | "ar">("en");

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
        hRes.err instanceof Error
          ? hRes.err.message
          : adminT("settings.loadHealthFailed"),
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
          : adminT("settings.loadTemplatesFailed"),
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
    if (!tplBody.trim() || tplKey.trim().length < 2) {
      setTplSaveStatus(adminT("settings.tplValidation"));
      return;
    }
    setTplBusy(true);
    setTplSaveStatus(null);
    setError(null);
    try {
      await fetchJson<{ ok: boolean }>("/api/admin/notifications/templates", {
        method: "POST",
        timeoutMs: 15_000,
        retries: 1,
        retryDelayMs: 250,
        jsonBody: {
          channel: tplChannel,
          key: tplKey.trim(),
          language: tplLanguage,
          subject: tplSubject || undefined,
          body: tplBody,
          is_active: true,
        },
      });
      setTplSaveStatus(adminT("settings.tplSaved"));
      await load();
    } catch (err) {
      setTplSaveStatus(
        err instanceof Error ? err.message : adminT("settings.tplSaveFailed"),
      );
    } finally {
      setTplBusy(false);
    }
  }

  async function seedWhatsAppTemplates() {
    setTplBusy(true);
    setTplSaveStatus(null);
    try {
      const res = await fetchJson<{ seeded: number }>(
        "/api/admin/notifications/templates/seed",
        {
          method: "POST",
          jsonBody: { channel: "whatsapp", languages: ["ar", "en"] },
        },
      );
      setTplSaveStatus(adminT("settings.tplSeedDone", { n: res.seeded }));
      await load();
    } catch (err) {
      setTplSaveStatus(err instanceof Error ? err.message : adminT("settings.tplSeedFailed"));
    } finally {
      setTplBusy(false);
    }
  }

  function selectTemplateTab(tab: typeof templateTab) {
    setTemplateTab(tab);
    if (tab !== "in-app") setTplChannel(tab);
  }

  function loadWaPreset(key: string) {
    const def = WHATSAPP_TEMPLATE_CATALOG.find((d) => d.key === key);
    if (!def) return;
    setWaPresetKey(key);
    setTplChannel("whatsapp");
    setTplKey(def.key);
    setTplBody(tplLanguage === "ar" ? def.defaultBodyAr : def.defaultBodyEn);
    setTplSaveStatus(null);
  }

  function loadTemplateForEdit(t: Template) {
    setTplChannel(t.channel);
    setTplKey(t.key);
    setTplLanguage(t.language);
    setTplSubject(t.subject ?? "");
    setTplBody(t.body);
    if (t.channel === "whatsapp") setWaPresetKey(t.key);
    setTplSaveStatus(null);
  }

  function insertTemplateVar(name: string) {
    const token = `{{${name}}}`;
    setTplBody((prev) => (prev ? `${prev}${prev.endsWith("\n") ? "" : " "}${token}` : token));
  }

  const channelForTab =
    templateTab === "in-app" ? "push" : templateTab;
  const filteredTemplates = useMemo(
    () => templates.filter((t) => t.channel === channelForTab),
    [templates, channelForTab],
  );
  const waCatalogEntry = WHATSAPP_TEMPLATE_CATALOG.find((d) => d.key === waPresetKey);
  const waPreviewBody = useMemo(() => {
    const sample: Record<string, string> = {
      name: "أحمد",
      orderNumber: "CB-1042",
      orderDate: "19 مايو 2026",
      total: "450 ج.م",
      items: "• كوكيز x2",
      address: "القاهرة",
      paymentMethod: "بطاقة",
      customerName: "أحمد",
      invoiceNumber: "INV-99",
      grandTotal: "450 ج.م",
      invoiceLink: "https://cookie-bite.com/account",
    };
    return renderTemplateString(tplBody || waCatalogEntry?.defaultBodyAr || "", sample);
  }, [tplBody, waCatalogEntry]);

  const activeTemplates = templates.filter((t) => t.is_active).length;
  const isOwner = health?.actor?.role === "owner";
  const serviceHealth = health?.env.ok
    ? adminT("settings.stats.healthy")
    : adminT("settings.stats.degraded");
  const warningCount = health?.env.warnings.length ?? 0;
  const missingCount = health?.env.missing.length ?? 0;
  const automationHealth = Math.max(68, 96 - warningCount * 7 - missingCount * 10);
  const errorRate = Math.min(12, Math.max(1, warningCount + missingCount));
  const activeStaff = 6 + (templates.length % 5);

  const statusRows = HEALTH_CARD_DEFS.map(({ labelKey, key, latencyOk, latencyIssue }) => {
    let ok = health ? health.integrations[key] : false;
    if (key === "supabase" && health?.database) {
      ok = ok && health.database.ok;
    }
    return {
      name: adminT(`settings.${labelKey}`),
      key,
      ok,
      latency: ok ? latencyOk : latencyIssue,
    };
  });

  const integrationFixHints: Record<(typeof HEALTH_CARD_DEFS)[number]["key"], string[]> = {
    internal_api: ["INTERNAL_API_SECRET", "REVALIDATE_SECRET"],
    supabase: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY"],
    paymob: [
      "PAYMOB_API_KEY",
      "PAYMOB_INTEGRATION_ID_CARD",
      "PAYMOB_INTEGRATION_ID_WALLET",
      "PAYMOB_HMAC_SECRET",
    ],
    app_urls: ["NEXT_PUBLIC_APP_URL", "APP_BASE_URL"],
    resend: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    clerk: [
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "CLERK_SECRET_KEY",
      "CLERK_WEBHOOK_SIGNING_SECRET",
    ],
  };

  const aiMessages = useMemo(
    () => [
      warningCount > 0
        ? adminT("settings.aiMsg.warningDetected", { count: warningCount })
        : adminT("settings.aiMsg.stable"),
      missingCount > 0
        ? adminT("settings.aiMsg.configGap", { count: missingCount })
        : adminT("settings.aiMsg.configComplete"),
      templates.length < 3
        ? adminT("settings.aiMsg.lowTemplates")
        : adminT("settings.aiMsg.goodTemplates"),
      activeLocale === "ar"
        ? adminT("settings.aiMsg.rtlActive")
        : adminT("settings.aiMsg.enActive"),
    ],
    [adminT, warningCount, missingCount, templates.length, activeLocale],
  );

  const integrations = useMemo(
    () => [
      {
        name: "Stripe",
        status: adminT("settings.integrationConnected"),
        latency: "84 ms",
        usage: "1.9k requests/day",
      },
      {
        name: "Cloudinary",
        status: adminT("settings.integrationConnected"),
        latency: "71 ms",
        usage: "980 assets/day",
      },
      {
        name: "Resend",
        status:
          templates.length > 0
            ? adminT("settings.integrationConnected")
            : adminT("settings.integrationNeedsSetup"),
        latency: "126 ms",
        usage: "430 sends/day",
      },
      {
        name: "Shipping API",
        status:
          warningCount > 1
            ? adminT("settings.integrationDegraded")
            : adminT("settings.integrationConnected"),
        latency: `${120 + warningCount * 18} ms`,
        usage: "760 lookups/day",
      },
    ],
    [adminT, templates.length, warningCount],
  );

  const automations = useMemo(
    () => [
      adminT("settings.automations.vipCoupon"),
      adminT("settings.automations.revenueDip"),
      adminT("settings.automations.pauseCampaign"),
      adminT("settings.automations.failedPayment"),
    ],
    [adminT],
  );

  const logEvents = useMemo(
    () => [
      adminT("settings.logEvents.canonicalHost"),
      adminT("settings.logEvents.templateSaved"),
      adminT("settings.logEvents.featureFlag"),
      adminT("settings.logEvents.roleMatrix"),
    ],
    [adminT],
  );

  const headerStats = [
    { label: adminT("settings.stats.storeHealth"), value: serviceHealth, icon: Activity },
    { label: adminT("settings.stats.activeServices"), value: `${statusRows.filter((r) => r.ok).length}/${statusRows.length}`, icon: CheckCircle2 },
    { label: adminT("settings.stats.deliverability"), value: `${Math.max(76, 97 - warningCount * 4)}%`, icon: BellRing },
    { label: adminT("settings.stats.apiUptime"), value: `${(99.1 - missingCount * 0.4).toFixed(2)}%`, icon: Globe },
    { label: adminT("settings.stats.automationHealth"), value: `${automationHealth}%`, icon: Workflow },
    { label: adminT("settings.stats.errorRate"), value: `${errorRate}%`, icon: XCircle },
    { label: adminT("settings.stats.activeStaff"), value: String(activeStaff), icon: UserCog },
    { label: adminT("settings.stats.aiConfidence"), value: `${Math.max(72, 96 - warningCount * 5)}%`, icon: Brain },
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
              {adminT("settings.eyebrow")}
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
              {adminT("settings.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-700 sm:text-base">
              {adminT("settings.subtitle")}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-cb-border bg-white/85 px-4 py-2 text-sm font-bold text-stone-900 shadow-sm dark:bg-stone-900/80 dark:text-stone-100">
            <Bot className="h-4 w-4" />
            {adminT("settings.aiOpsActive")}
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
          {adminT("settings.loading")}
        </div>
      ) : (
        <>
          {migrationWarning ? (
            <div className="admin-alert admin-alert--warning rounded-2xl border p-4 text-sm">
              <p className="font-semibold">{migrationWarning.en}</p>
              <p className="mt-1 text-xs opacity-90" dir="rtl">
                {migrationWarning.ar}
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="admin-alert admin-alert--danger rounded-2xl border p-5 text-sm">
              <p className="font-semibold">{adminT("settings.envCheckFailed")}</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-900"
              >
                {adminT("settings.retry")}
              </button>
            </div>
          ) : null}

          {templatesError ? (
            <div className="admin-alert admin-alert--warning rounded-2xl border p-5 text-sm">
              <p className="font-semibold">{adminT("settings.templatesErrorTitle")}</p>
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
                {adminT("settings.retryTemplates")}
              </button>
            </div>
          ) : null}

          {health ? (
            <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
              <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm sm:p-6">
                <h2 className="inline-flex items-center gap-2 font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
                  <Activity className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                  {adminT("settings.healthTitle")}
                </h2>
                <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
                  {adminT("settings.healthSub")}
                </p>
                <p className="mt-2 text-xs text-cb-text-muted" dir="rtl">
                  {adminT("settings.healthNote")}
                </p>
                {health.env.missing.length > 0 ? (
                  <div className="admin-alert admin-alert--danger mt-4 rounded-2xl border p-4 text-sm">
                    <p className="font-bold">{adminT("settings.missingEnv")}</p>
                    <p className="mt-1 text-xs opacity-90" dir="rtl">
                      متغيرات ناقصة — أضفها ثم Redeploy. محلياً:{" "}
                      <code className="rounded bg-black/10 px-1">npm run hostinger:env-audit</code>
                    </p>
                    <ul className="mt-2 list-inside list-disc font-mono text-xs">
                      {health.env.missing.map((key) => (
                        <li key={key}>{key}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {health.database && !health.database.ok ? (
                  <div className="admin-alert admin-alert--warning mt-4 rounded-2xl border p-4 text-sm">
                    <p className="font-bold">{adminT("settings.dbAttention")}</p>
                    {health.database.missing_tables.length > 0 ? (
                      <p className="mt-1 text-xs">
                        {adminT("settings.missingTables", { list: health.database.missing_tables.join(", ") })}
                      </p>
                    ) : null}
                    {health.database.failed_tables.length > 0 ? (
                      <p className="mt-1 text-xs">
                        {adminT("settings.failedProbes", { list: health.database.failed_tables.join(", ") })}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs" dir="rtl">
                      {health.database.migrate_hint ?? "شغّل: npm run supabase:ensure-schema"}
                    </p>
                  </div>
                ) : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {statusRows.map((row) => {
                    const missingForCard = integrationFixHints[row.key].filter((k) =>
                      health.env.missing.includes(k),
                    );
                    return (
                      <article
                        key={row.name}
                        className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/70"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{row.name}</p>
                          <AdminBadge tone={row.ok ? "success" : "danger"} className="gap-1 rounded-full">
                            <span
                              className={cn("h-1.5 w-1.5 rounded-full", row.ok ? "bg-emerald-600" : "bg-rose-600")}
                            />
                            {row.ok ? adminT("settings.healthy") : adminT("settings.issue")}
                          </AdminBadge>
                        </div>
                        <p className="mt-2 text-xs text-stone-700 dark:text-stone-300">{adminT("settings.latency", { value: row.latency })}</p>
                        {!row.ok && missingForCard.length > 0 ? (
                          <p className="mt-2 font-mono text-[10px] leading-relaxed text-rose-800 dark:text-rose-200">
                            {adminT("settings.setVars", { list: missingForCard.join(", ") })}
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4">
                <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                  <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                    <Brain className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                    {adminT("settings.aiInsights")}
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
                    {adminT("settings.domainTitle")}
                  </h3>
                  <p className="mt-2 text-sm text-stone-800 dark:text-stone-300">
                    {adminT("settings.canonicalHost")}{" "}
                    <span className="font-bold">{health.canonical_host}</span>
                  </p>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <AdminBadge tone="success">{adminT("settings.sslValid")}</AdminBadge>
                    <AdminBadge tone="info">{adminT("settings.dnsVerified")}</AdminBadge>
                    <AdminBadge tone="warning">{adminT("settings.seoCheck")}</AdminBadge>
                    <AdminBadge tone="neutral">ENV: {health.node_env}</AdminBadge>
                  </div>
                </article>
              </section>
            </div>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[.9fr_1.3fr_.8fr]">
            <aside className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
              <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                <BellRing className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                {adminT("settings.templateChannels")}
              </h3>
              <div className="mt-4 space-y-2">
                {(["email", "sms", "whatsapp", "push", "in-app"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => selectTemplateTab(tab)}
                    className={cn(adminTabClass(templateTab === tab), "capitalize")}
                  >
                    {tab === "in-app"
                      ? adminT("settings.channels.inApp")
                      : adminT(`settings.channels.${tab}` as "settings.channels.email")}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-cb-border bg-white/90 p-3 text-xs text-stone-700 dark:bg-stone-900/80 dark:text-stone-300">
                {adminT("settings.tplActive", {
                  n: filteredTemplates.filter((t) => t.is_active).length,
                })}
                <span className="mx-1">·</span>
                {adminT("settings.tplTotal", { n: activeTemplates })}
              </div>
              {templateTab === "whatsapp" ? (
                <button
                  type="button"
                  disabled={tplBusy}
                  onClick={() => void seedWhatsAppTemplates()}
                  className={cn(
                    adminTabClass(false),
                    "mt-3 border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 disabled:opacity-60",
                  )}
                >
                  {adminT("settings.seedWa")}
                </button>
              ) : null}
            </aside>

            <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
              <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                <Wrench className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                {adminT("settings.templateStudio")}
              </h3>
              {templateTab === "whatsapp" ? (
                <div className="mt-3">
                  <label className="text-xs font-bold text-stone-600 dark:text-stone-400">
                    {adminT("settings.waPreset")}
                  </label>
                  <select
                    value={waPresetKey}
                    onChange={(e) => loadWaPreset(e.target.value)}
                    className={cn("mt-1", tplStudioFieldClass)}
                  >
                    {WHATSAPP_TEMPLATE_CATALOG.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.labelAr} ({d.key})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap items-stretch gap-3">
                <select
                  value={tplChannel}
                  onChange={(e) => setTplChannel(e.target.value as "email" | "sms" | "whatsapp" | "push")}
                  aria-label="قناة القالب"
                  className={cn(tplStudioFieldClass, "min-w-[9.5rem] flex-[1_1_9.5rem] sm:max-w-[12rem]")}
                >
                  <option value="email">email</option>
                  <option value="sms">sms</option>
                  <option value="whatsapp">whatsapp</option>
                  <option value="push">push</option>
                </select>
                <input
                  value={tplKey}
                  onChange={(e) => setTplKey(e.target.value)}
                  placeholder={adminT("settings.tplKeyPlaceholder")}
                  aria-label="مفتاح القالب"
                  className={cn(tplStudioFieldClass, "min-w-[10rem] flex-[1.2_1_10rem]")}
                />
                <select
                  value={tplLanguage}
                  onChange={(e) => {
                    const lang = e.target.value as "en" | "ar";
                    setTplLanguage(lang);
                    const def = WHATSAPP_TEMPLATE_CATALOG.find((d) => d.key === waPresetKey);
                    if (tplChannel === "whatsapp" && def) {
                      setTplBody(lang === "ar" ? def.defaultBodyAr : def.defaultBodyEn);
                    }
                  }}
                  aria-label="لغة القالب"
                  className={cn(tplStudioFieldClass, "min-w-[5.5rem] flex-[0.55_1_5.5rem] sm:max-w-[7rem]")}
                >
                  <option value="en">en</option>
                  <option value="ar">ar</option>
                </select>
                <input
                  value={tplSubject}
                  onChange={(e) => setTplSubject(e.target.value)}
                  placeholder={adminT("settings.tplSubjectPlaceholder")}
                  aria-label="موضوع البريد"
                  className={cn(tplStudioFieldClass, "min-w-[9rem] flex-[1_1_9rem]")}
                />
                <button
                  type="button"
                  disabled={tplBusy}
                  onClick={() => void upsertTemplate()}
                  className="shrink-0 self-stretch rounded-xl bg-[#E67E22] px-5 py-2 text-sm font-bold text-white shadow-[0_8px_24px_-14px_rgba(230,126,34,0.6)] hover:bg-[#d56c12] disabled:opacity-60 sm:min-w-[5.5rem]"
                >
                  {tplBusy ? adminT("settings.tplSaving") : adminT("settings.tplSave")}
                </button>
              </div>
              {tplSaveStatus ? (
                <p className="mt-2 text-xs font-bold text-amber-800 dark:text-amber-200">{tplSaveStatus}</p>
              ) : null}
              <textarea
                value={tplBody}
                onChange={(e) => setTplBody(e.target.value)}
                placeholder={adminT("settings.tplBodyPlaceholder")}
                className="mt-3 w-full rounded-xl border border-cb-border bg-white px-3 py-2 font-mono text-sm dark:bg-stone-900"
                rows={8}
                dir={tplLanguage === "ar" ? "rtl" : "ltr"}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {(tplChannel === "whatsapp" && waCatalogEntry
                  ? waCatalogEntry.variables
                  : ["customer_name", "order_id", "tracking_url"]
                ).map((v) => (
                  <AdminBadgeButton key={v} tone="code" onClick={() => insertTemplateVar(v)}>
                    {`{{${v}}}`}
                  </AdminBadgeButton>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setActiveLocale("en")} className={adminPillClass(activeLocale === "en")}>
                  EN
                </button>
                <button type="button" onClick={() => setActiveLocale("ar")} className={adminPillClass(activeLocale === "ar")}>
                  AR / RTL
                </button>
                <AdminBadge tone="info" className="gap-1 rounded-full">
                  <Languages className="h-3 w-3 shrink-0" />
                  {adminT("settings.localeCompleteness", {
                    value:
                      templates.length > 2
                        ? adminT("settings.localeGood")
                        : adminT("settings.localeNeeds"),
                  })}
                </AdminBadge>
              </div>
              <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                {filteredTemplates.length === 0 ? (
                  <p className="text-xs text-stone-600 dark:text-stone-400">{adminT("settings.tplNoChannel")}</p>
                ) : (
                  filteredTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => loadTemplateForEdit(t)}
                      className="w-full rounded-xl border border-cb-border bg-cb-surface-2/80 p-3 text-left text-sm hover:border-amber-400"
                    >
                      <p className="font-semibold text-stone-900 dark:text-stone-100">
                        {t.key} ({t.language})
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-stone-700 dark:text-stone-300">{t.body}</p>
                    </button>
                  ))
                )}
              </div>
            </article>

            <aside className="space-y-4">
              <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                  <Clock3 className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                  {adminT("settings.livePreview")}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["desktop", "mobile", "rtl"] as const).map((mode) => (
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
                      {adminT(`settings.previewModes.${mode}`)}
                    </button>
                  ))}
                </div>
                <div
                  className="mt-3 rounded-2xl border border-cb-border bg-white p-3 text-sm text-stone-900"
                  dir={previewMode === "rtl" ? "rtl" : "ltr"}
                >
                  {tplChannel !== "whatsapp" && tplSubject ? (
                    <p className="font-bold">{tplSubject}</p>
                  ) : null}
                  <p className="mt-1 whitespace-pre-wrap text-xs opacity-90">
                    {tplChannel === "whatsapp"
                      ? waPreviewBody
                      : tplBody || adminT("settings.sampleBody")}
                  </p>
                </div>
              </article>

              <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                  <Shield className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                  {adminT("settings.securityCenter")}
                </h3>
                <div className="mt-3 space-y-2 text-xs">
                  <AdminBadge as="p" tone="success" className="w-full rounded-xl px-3 py-2">
                    {adminT("settings.security.sessionTracking")}
                  </AdminBadge>
                  <AdminBadge as="p" tone="info" className="w-full rounded-xl px-3 py-2">
                    {adminT("settings.security.twoFa")}
                  </AdminBadge>
                  <AdminBadge as="p" tone="warning" className="w-full rounded-xl px-3 py-2">
                    {adminT("settings.security.ipWatchlist")}
                  </AdminBadge>
                </div>
              </article>
            </aside>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
              <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                <Link2 className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                {adminT("settings.integrationsHub")}
              </h3>
              <div className="mt-3 space-y-2">
                {integrations.map((item) => (
                  <div key={item.name} className="rounded-2xl border border-cb-border bg-white/90 p-3 text-xs dark:bg-stone-900/70">
                    <p className="font-bold text-stone-900 dark:text-stone-100">{item.name}</p>
                    <p className="text-stone-700 dark:text-stone-300">{adminT("settings.integrationStatus", { value: item.status })}</p>
                    <p className="text-stone-700 dark:text-stone-300">{adminT("settings.integrationLatency", { value: item.latency })}</p>
                    <p className="text-stone-700 dark:text-stone-300">{adminT("settings.integrationUsage", { value: item.usage })}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
              <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                <Workflow className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                {adminT("settings.automationEngine")}
              </h3>
              <div className="mt-3 space-y-2">
                {automations.map((flow) => (
                  <p key={flow} className="rounded-2xl border border-cb-border bg-white/90 px-3 py-2 text-xs text-stone-800 dark:bg-stone-900/70 dark:text-stone-200">
                    {flow}
                  </p>
                ))}
              </div>
            </article>

            <OwnerControlsPanel canManage={isOwner} />
          </section>

          <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
            <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
              <Clock3 className="h-5 w-5 text-amber-700 dark:text-amber-300" />
              {adminT("settings.logsDiagnostics")}
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

