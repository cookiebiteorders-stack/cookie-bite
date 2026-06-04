"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BellRing,
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe,
  KeyRound,
  Languages,
  Link2,
  RefreshCw,
  Shield,
  Sparkles,
  Wrench,
  XCircle,
} from "lucide-react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { fetchJson } from "@/lib/http/fetch-json";
import { renderTemplateString } from "@/lib/notifications/template-vars";
import { WHATSAPP_TEMPLATE_CATALOG } from "@/lib/notifications/whatsapp-template-catalog";
import type { IntegrationEnvStatus } from "@/lib/config/production-lock";
import {
  CORE_HEALTH_CARD_DEFS,
  INTEGRATION_FIX_HINTS,
  SETTINGS_INTEGRATION_DEFS,
} from "@/lib/admin/settings-integrations";
import { formatAuditAction, formatAuditModule } from "@/lib/admin/format-audit-event";
import { cn } from "@/lib/utils";
import { useAdminT } from "@/lib/admin/use-admin-t";
import { AdminBadge, AdminBadgeButton, adminTabClass } from "@/components/admin/admin-badge";
import { OwnerControlsPanel } from "@/components/admin/owner-controls-panel";
import { AutomationCenterPanel } from "@/components/admin/settings/automation-center-panel";

const tplStudioFieldClass = "cb-field min-w-0 w-full dark:bg-stone-900";

type SettingsTab = "overview" | "automations" | "templates" | "integrations" | "owner";

type HealthResponse = {
  canonical_host: string;
  node_env: string;
  env: { ok: boolean; missing: string[]; warnings: string[] };
  integrations: IntegrationEnvStatus;
  database?: {
    ok: boolean;
    configured: boolean;
    missing_tables: string[];
    failed_tables: string[];
    migrate_hint?: string;
  };
  cron?: {
    configured: boolean;
    endpoints: string[];
    schedule_hint: string;
    auth_header: string;
  };
  actor?: { role: string };
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

type AuditLogRow = {
  id: string;
  actor_email: string | null;
  action: string;
  module: string;
  created_at: string;
};

const SETTINGS_TABS: SettingsTab[] = [
  "overview",
  "automations",
  "templates",
  "integrations",
  "owner",
];

export function AdminSettingsDashboard() {
  const { adminT, lang } = useAdminT();
  const [activeTab, setActiveTab] = useState<SettingsTab>("overview");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [migrationWarning, setMigrationWarning] = useState<{ en: string; ar: string } | null>(null);

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

    const templatesP = fetchJson<TemplatesResponse>("/api/admin/notifications/templates", {
      cache: "no-store",
      timeoutMs: 15_000,
      retries: 1,
      retryDelayMs: 250,
    })
      .then((data) => ({ ok: true as const, data }))
      .catch((err: unknown) => ({ ok: false as const, err }));

    const auditP = fetchJson<{ logs: AuditLogRow[] }>(
      "/api/admin/audit-logs?module=settings&limit=12&page=1",
      { cache: "no-store", timeoutMs: 12_000 },
    )
      .then((data) => ({ ok: true as const, data }))
      .catch(() => ({ ok: false as const, data: { logs: [] as AuditLogRow[] } }));

    const [hRes, tRes, aRes] = await Promise.all([healthP, templatesP, auditP]);

    if (hRes.ok) setHealth(hRes.data);
    else {
      setHealth(null);
      setError(hRes.err instanceof Error ? hRes.err.message : adminT("settings.loadHealthFailed"));
    }

    if (tRes.ok) {
      setTemplates(tRes.data.templates ?? []);
      setMigrationWarning(tRes.data.warning ?? null);
    } else {
      setTemplates([]);
      setTemplatesError(
        tRes.err instanceof Error ? tRes.err.message : adminT("settings.loadTemplatesFailed"),
      );
    }

    setRecentAudit(aRes.ok ? (aRes.data.logs ?? []) : []);
    setLoading(false);
  }

  useEffect(() => {
    const cancel = scheduleEffectTask(() => void load());
    return cancel;
  }, []);

  async function upsertTemplate(isActive = true) {
    if (!tplBody.trim() || tplKey.trim().length < 2) {
      setTplSaveStatus(adminT("settings.tplValidation"));
      return;
    }
    setTplBusy(true);
    setTplSaveStatus(null);
    try {
      await fetchJson("/api/admin/notifications/templates", {
        method: "POST",
        timeoutMs: 15_000,
        jsonBody: {
          channel: tplChannel,
          key: tplKey.trim(),
          language: tplLanguage,
          subject: tplSubject || undefined,
          body: tplBody,
          is_active: isActive,
        },
      });
      setTplSaveStatus(isActive ? adminT("settings.tplSaved") : adminT("settings.tplDeactivated"));
      await load();
    } catch (err) {
      setTplSaveStatus(err instanceof Error ? err.message : adminT("settings.tplSaveFailed"));
    } finally {
      setTplBusy(false);
    }
  }

  async function toggleTemplateActive(t: Template) {
    setTplBusy(true);
    setTplSaveStatus(null);
    try {
      await fetchJson("/api/admin/notifications/templates", {
        method: "POST",
        jsonBody: {
          channel: t.channel,
          key: t.key,
          language: t.language,
          subject: t.subject ?? undefined,
          body: t.body,
          is_active: !t.is_active,
        },
      });
      setTplSaveStatus(
        t.is_active ? adminT("settings.tplDeactivated") : adminT("settings.tplActivated"),
      );
      await load();
    } catch (err) {
      setTplSaveStatus(err instanceof Error ? err.message : adminT("settings.tplSaveFailed"));
    } finally {
      setTplBusy(false);
    }
  }

  async function seedWhatsAppTemplates() {
    setTplBusy(true);
    setTplSaveStatus(null);
    try {
      const res = await fetchJson<{ seeded: number }>("/api/admin/notifications/templates/seed", {
        method: "POST",
        jsonBody: { channel: "whatsapp", languages: ["ar", "en"] },
      });
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
    setActiveTab("templates");
  }

  function insertTemplateVar(name: string) {
    const token = `{{${name}}}`;
    setTplBody((prev) => (prev ? `${prev}${prev.endsWith("\n") ? "" : " "}${token}` : token));
  }

  const channelForTab = templateTab === "in-app" ? "push" : templateTab;
  const filteredTemplates = useMemo(
    () =>
      templates
        .filter((t) => t.channel === channelForTab)
        .sort((a, b) => a.key.localeCompare(b.key) || a.language.localeCompare(b.language)),
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

  const isOwner = health?.actor?.role === "owner";
  const warningCount = health?.env.warnings.length ?? 0;
  const missingCount = health?.env.missing.length ?? 0;
  const serviceHealth = health?.env.ok
    ? adminT("settings.stats.healthy")
    : adminT("settings.stats.degraded");

  const statusRows = useMemo(() => {
    if (!health) return [];
    return CORE_HEALTH_CARD_DEFS.map(({ labelKey, key }) => {
      let ok = health.integrations[key];
      if (key === "supabase" && health.database) ok = ok && health.database.ok;
      const missingForCard = INTEGRATION_FIX_HINTS[key].filter((k) => health.env.missing.includes(k));
      return { name: adminT(labelKey), key, ok, missingForCard };
    });
  }, [health, adminT]);

  const integrationRows = useMemo(() => {
    if (!health) return [];
    return SETTINGS_INTEGRATION_DEFS.map((def) => ({
      ...def,
      ok: health.integrations[def.key],
      missing: def.envKeys.filter((k) => health.env.missing.includes(k)),
    }));
  }, [health]);

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
      health?.cron?.configured
        ? adminT("settings.aiMsg.cronReady")
        : adminT("settings.aiMsg.cronMissing"),
    ],
    [adminT, warningCount, missingCount, templates.length, health?.cron?.configured],
  );

  const headerStats = useMemo(
    () => [
      { label: adminT("settings.stats.storeHealth"), value: serviceHealth, icon: Activity },
      {
        label: adminT("settings.stats.activeServices"),
        value: `${statusRows.filter((r) => r.ok).length}/${statusRows.length}`,
        icon: CheckCircle2,
      },
      {
        label: adminT("settings.stats.templates"),
        value: String(templates.filter((t) => t.is_active).length),
        icon: BellRing,
      },
      { label: adminT("settings.stats.warnings"), value: String(warningCount), icon: Globe },
      { label: adminT("settings.stats.missingVars"), value: String(missingCount), icon: XCircle },
      {
        label: adminT("settings.stats.optionalIntegrations"),
        value: `${integrationRows.filter((r) => !r.required && r.ok).length}/${integrationRows.filter((r) => !r.required).length}`,
        icon: Link2,
      },
    ],
    [adminT, serviceHealth, statusRows, templates, warningCount, missingCount, integrationRows],
  );

  const quickLinks = [
    { href: "/admin/email/settings", label: adminT("settings.quickLinks.email") },
    { href: "/admin/audit-logs?module=settings", label: adminT("settings.quickLinks.audit") },
    { href: "/admin/roles", label: adminT("settings.quickLinks.roles") },
    { href: "/admin/cms", label: adminT("settings.quickLinks.cms") },
    { href: "/admin/media", label: adminT("settings.quickLinks.media") },
  ];

  return (
    <section className="space-y-6 pb-10">
      <header className="admin-panel-surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="admin-panel-scrim" aria-hidden />
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
            <p className="mt-1 text-xs text-stone-600">{adminT("settings.dataNote")}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-cb-border bg-white/85 px-4 py-2 text-sm font-bold text-stone-900 shadow-sm disabled:opacity-60 dark:bg-stone-900/80 dark:text-stone-100"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {adminT("settings.refresh")}
          </button>
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {headerStats.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-cb-border/70 bg-white/90 p-4 shadow-sm dark:bg-stone-900/70"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">
                  {item.label}
                </p>
                <item.icon className="h-4 w-4 text-amber-700 dark:text-amber-300" />
              </div>
              <p className="mt-2 font-serif text-xl font-bold text-stone-950 dark:text-white">{item.value}</p>
            </article>
          ))}
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-2xl border border-cb-border bg-cb-surface-elevated p-2">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(adminTabClass(activeTab === tab), "px-4 py-2")}
          >
            {adminT(`settings.tabs.${tab}`)}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-6 text-sm text-stone-700">
          {adminT("settings.loading")}
        </div>
      ) : (
        <>
          {migrationWarning ? (
            <div className="admin-alert admin-alert--warning rounded-2xl border p-4 text-sm">
              <p className="font-semibold" dir={lang === "ar" ? "rtl" : "ltr"}>
                {lang === "ar" ? migrationWarning.ar : migrationWarning.en}
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
              <p className="mt-2 text-xs text-cb-text-muted" dir={lang === "ar" ? "rtl" : "ltr"}>
                {adminT("settings.templatesMigrationHint")}
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900"
              >
                {adminT("settings.retryTemplates")}
              </button>
            </div>
          ) : null}

          {activeTab === "overview" && health ? (
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
                <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm sm:p-6">
                  <h2 className="inline-flex items-center gap-2 font-serif text-2xl font-bold text-stone-900">
                    <Activity className="h-5 w-5 text-amber-700" />
                    {adminT("settings.healthTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-stone-700">{adminT("settings.healthSub")}</p>
                  {health.env.missing.length > 0 ? (
                    <div className="admin-alert admin-alert--danger mt-4 rounded-2xl border p-4 text-sm">
                      <p className="font-bold">{adminT("settings.missingEnv")}</p>
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
                          {adminT("settings.missingTables", {
                            list: health.database.missing_tables.join(", "),
                          })}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs">
                        {health.database.migrate_hint ?? adminT("settings.migrateHintDefault")}
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {statusRows.map((row) => (
                      <article
                        key={row.key}
                        className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/70"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{row.name}</p>
                          <AdminBadge tone={row.ok ? "success" : "danger"} className="gap-1 rounded-full">
                            {row.ok ? adminT("settings.healthy") : adminT("settings.issue")}
                          </AdminBadge>
                        </div>
                        {!row.ok && row.missingForCard.length > 0 ? (
                          <p className="mt-2 font-mono text-[10px] text-rose-800 dark:text-rose-200">
                            {adminT("settings.setVars", { list: row.missingForCard.join(", ") })}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                    <h3 className="font-serif text-xl font-bold text-stone-900">{adminT("settings.aiInsights")}</h3>
                    <div className="mt-3 space-y-2">
                      {aiMessages.map((msg) => (
                        <p
                          key={msg}
                          className="rounded-2xl border border-cb-border bg-white/90 px-3 py-2 text-xs text-stone-800"
                        >
                          {msg}
                        </p>
                      ))}
                    </div>
                  </article>
                  <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                    <h3 className="font-serif text-xl font-bold text-stone-900">{adminT("settings.domainTitle")}</h3>
                    <p className="mt-2 text-sm">
                      {adminT("settings.canonicalHost")}{" "}
                      <span className="font-bold">{health.canonical_host}</span>
                    </p>
                    <AdminBadge tone="neutral" className="mt-2">
                      {adminT("settings.envLabel", { value: health.node_env })}
                    </AdminBadge>
                  </article>
                  {health.cron ? (
                    <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                      <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900">
                        <Clock3 className="h-5 w-5 text-amber-700" />
                        {adminT("settings.cronTitle")}
                      </h3>
                      <p className="mt-1 text-xs text-stone-600">{adminT("settings.cronSub")}</p>
                      <AdminBadge tone={health.cron.configured ? "success" : "warning"} className="mt-2">
                        {health.cron.configured
                          ? adminT("settings.cronConfigured")
                          : adminT("settings.cronNotConfigured")}
                      </AdminBadge>
                      <ul className="mt-3 space-y-1 font-mono text-[11px] text-stone-700">
                        {health.cron.endpoints.map((ep) => (
                          <li key={ep} className="rounded-lg border border-cb-border bg-white/80 px-2 py-1">
                            {ep}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[10px] text-stone-600">
                        {adminT("settings.cronAuth", {
                          header: health.cron.auth_header,
                          hint: health.cron.schedule_hint,
                        })}
                      </p>
                    </article>
                  ) : null}
                </section>
              </div>

              <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                <h3 className="font-serif text-xl font-bold text-stone-900">{adminT("settings.quickLinksTitle")}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="inline-flex items-center gap-1 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold hover:border-amber-300"
                    >
                      {link.label}
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "automations" ? <AutomationCenterPanel /> : null}

          {activeTab === "templates" ? (
            <section className="grid gap-6 xl:grid-cols-[.9fr_1.3fr_.8fr]">
              <aside className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                <h3 className="font-serif text-xl font-bold">{adminT("settings.templateChannels")}</h3>
                <div className="mt-4 space-y-2">
                  {(["email", "sms", "whatsapp", "push", "in-app"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => selectTemplateTab(tab)}
                      className={cn(adminTabClass(templateTab === tab), "capitalize w-full")}
                    >
                      {tab === "in-app"
                        ? adminT("settings.channels.inApp")
                        : adminT(`settings.channels.${tab}` as "settings.channels.email")}
                    </button>
                  ))}
                </div>
                {templateTab === "whatsapp" ? (
                  <button
                    type="button"
                    disabled={tplBusy}
                    onClick={() => void seedWhatsAppTemplates()}
                    className={cn(adminTabClass(false), "mt-3 w-full border-emerald-300 bg-emerald-50 text-emerald-900")}
                  >
                    {adminT("settings.seedWa")}
                  </button>
                ) : null}
              </aside>

              <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                <h3 className="font-serif text-xl font-bold">{adminT("settings.templateStudio")}</h3>
                {templateTab === "whatsapp" ? (
                  <select
                    value={waPresetKey}
                    onChange={(e) => loadWaPreset(e.target.value)}
                    className={cn("mt-3", tplStudioFieldClass)}
                  >
                    {WHATSAPP_TEMPLATE_CATALOG.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.labelAr} ({d.key})
                      </option>
                    ))}
                  </select>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <select
                    value={tplChannel}
                    onChange={(e) => setTplChannel(e.target.value as Template["channel"])}
                    className={tplStudioFieldClass}
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
                    className={tplStudioFieldClass}
                  />
                  <select
                    value={tplLanguage}
                    onChange={(e) => setTplLanguage(e.target.value as "en" | "ar")}
                    className={tplStudioFieldClass}
                  >
                    <option value="en">en</option>
                    <option value="ar">ar</option>
                  </select>
                  <input
                    value={tplSubject}
                    onChange={(e) => setTplSubject(e.target.value)}
                    placeholder={adminT("settings.tplSubjectPlaceholder")}
                    className={tplStudioFieldClass}
                  />
                  <button
                    type="button"
                    disabled={tplBusy}
                    onClick={() => void upsertTemplate(true)}
                    className="rounded-xl bg-[#E67E22] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {tplBusy ? adminT("settings.tplSaving") : adminT("settings.tplSave")}
                  </button>
                </div>
                {tplSaveStatus ? <p className="mt-2 text-xs font-bold text-amber-800">{tplSaveStatus}</p> : null}
                <textarea
                  value={tplBody}
                  onChange={(e) => setTplBody(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-cb-border px-3 py-2 font-mono text-sm"
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
                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                  {filteredTemplates.length === 0 ? (
                    <p className="text-xs text-stone-600">{adminT("settings.tplNoChannel")}</p>
                  ) : (
                    filteredTemplates.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-xl border border-cb-border bg-cb-surface-2/80 p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => loadTemplateForEdit(t)}
                            className="text-left font-semibold hover:text-amber-800"
                          >
                            {t.key} ({t.language})
                            {!t.is_active ? (
                              <span className="ms-2 text-[10px] text-rose-600">
                                {adminT("settings.tplInactive")}
                              </span>
                            ) : null}
                          </button>
                          <button
                            type="button"
                            disabled={tplBusy}
                            onClick={() => void toggleTemplateActive(t)}
                            className="shrink-0 text-[10px] font-bold text-stone-600 underline"
                          >
                            {t.is_active ? adminT("settings.tplDeactivate") : adminT("settings.tplActivate")}
                          </button>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-stone-600">{t.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <aside className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                <h3 className="font-serif text-xl font-bold">{adminT("settings.livePreview")}</h3>
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
                          : "border border-cb-border bg-white",
                      )}
                    >
                      {adminT(`settings.previewModes.${mode}`)}
                    </button>
                  ))}
                </div>
                <div
                  className="mt-3 rounded-2xl border border-cb-border bg-white p-3 text-sm"
                  dir={previewMode === "rtl" ? "rtl" : "ltr"}
                >
                  {tplChannel !== "whatsapp" && tplSubject ? <p className="font-bold">{tplSubject}</p> : null}
                  <p className="mt-1 whitespace-pre-wrap text-xs">
                    {tplChannel === "whatsapp" ? waPreviewBody : tplBody || adminT("settings.sampleBody")}
                  </p>
                </div>
              </aside>
            </section>
          ) : null}

          {activeTab === "integrations" && health ? (
            <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
              <h2 className="font-serif text-2xl font-bold text-stone-900">{adminT("settings.integrationsHub")}</h2>
              <p className="mt-1 text-sm text-stone-600">{adminT("settings.integrationsSub")}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {integrationRows.map((row) => (
                  <article
                    key={row.key}
                    className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-stone-900">{adminT(row.labelKey)}</p>
                      <AdminBadge tone={row.ok ? "success" : row.required ? "danger" : "warning"}>
                        {row.ok
                          ? adminT("settings.integrationConnected")
                          : row.required
                            ? adminT("settings.integrationNeedsSetup")
                            : adminT("settings.integrationOptionalOff")}
                      </AdminBadge>
                    </div>
                    <p className="mt-1 text-[10px] text-stone-600">
                      {row.required ? adminT("settings.integrationRequired") : adminT("settings.integrationOptional")}
                    </p>
                    {!row.ok && row.missing.length > 0 ? (
                      <p className="mt-2 font-mono text-[10px] text-rose-800">
                        {adminT("settings.setVars", { list: row.missing.join(", ") })}
                      </p>
                    ) : null}
                    {row.adminPath ? (
                      <Link
                        href={row.adminPath}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-800 underline"
                      >
                        {adminT("settings.openAdminPage")}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === "owner" ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <OwnerControlsPanel canManage={isOwner} />
              <section className="space-y-4">
                <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                  <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold">
                    <Shield className="h-5 w-5 text-amber-700" />
                    {adminT("settings.securityCenter")}
                  </h3>
                  <p className="mt-1 text-xs text-stone-600">{adminT("settings.securitySub")}</p>
                  <div className="mt-3 space-y-2">
                    <Link
                      href="/admin/audit-logs"
                      className="block rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold hover:border-amber-300"
                    >
                      {adminT("settings.security.auditLogs")}
                    </Link>
                    <Link
                      href="/admin/roles"
                      className="block rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold hover:border-amber-300"
                    >
                      {adminT("settings.security.roles")}
                    </Link>
                    <AdminBadge tone={health?.integrations.clerk ? "success" : "warning"} className="w-full rounded-xl px-3 py-2">
                      {health?.integrations.clerk
                        ? adminT("settings.security.clerkOk")
                        : adminT("settings.security.clerkIssue")}
                    </AdminBadge>
                  </div>
                </article>

                <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
                  <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold">
                    <KeyRound className="h-5 w-5 text-amber-700" />
                    {adminT("settings.recentActivity")}
                  </h3>
                  <p className="mt-1 text-xs text-stone-600">{adminT("settings.recentActivitySub")}</p>
                  <div className="mt-3 space-y-2">
                    {recentAudit.length === 0 ? (
                      <p className="text-xs text-stone-600">{adminT("settings.noRecentActivity")}</p>
                    ) : (
                      recentAudit.map((log) => (
                        <div
                          key={log.id}
                          className="rounded-xl border border-cb-border bg-stone-950 px-3 py-2 text-xs text-stone-100"
                        >
                          <p className="font-bold">{formatAuditAction(log.action, adminT)}</p>
                          <p className="mt-0.5 opacity-80">
                            {formatAuditModule(log.module, adminT)} · {log.actor_email ?? "—"} ·{" "}
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <Link
                    href="/admin/audit-logs?module=settings"
                    className="mt-3 inline-block text-xs font-bold text-amber-800 underline"
                  >
                    {adminT("settings.viewAllAudit")}
                  </Link>
                </article>
              </section>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
