/** Audit log presentation helpers (severity, presets, user-agent parsing). */

export type AuditSeverity = "info" | "low" | "medium" | "high" | "critical";

export type AuditPresetId = "all" | "failedLogins" | "criticalShipping" | "last24h";

export type AuditLogRow = {
  id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  module: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  created_at: string;
};

export function deriveSeverity(log: Pick<AuditLogRow, "action" | "module">): AuditSeverity {
  const action = log.action.toLowerCase();
  const mod = log.module.toLowerCase();
  if (action.includes("delete") || action.includes("revoke") || action.includes("failed")) {
    return "high";
  }
  if (action.includes("role") || action.includes("permission") || mod.includes("security")) {
    return "critical";
  }
  if (action.includes("update") || action.includes("edit")) {
    return "medium";
  }
  if (action.includes("create") || action.includes("sync") || action.includes("import")) {
    return "low";
  }
  return "info";
}

export function severityClass(severity: AuditSeverity): string {
  if (severity === "critical") {
    return "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200";
  }
  if (severity === "high") {
    return "bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200";
  }
  if (severity === "medium") {
    return "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200";
  }
  if (severity === "low") {
    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200";
  }
  return "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200";
}

export function parseUserAgent(ua: string | null): string {
  if (!ua?.trim()) return "—";
  const s = ua.toLowerCase();
  let browser = "Browser";
  if (s.includes("chrome") && !s.includes("edg")) browser = "Chrome";
  else if (s.includes("firefox")) browser = "Firefox";
  else if (s.includes("safari") && !s.includes("chrome")) browser = "Safari";
  else if (s.includes("edg")) browser = "Edge";

  let os = "";
  if (s.includes("windows")) os = "Windows";
  else if (s.includes("mac os") || s.includes("macintosh")) os = "macOS";
  else if (s.includes("android")) os = "Android";
  else if (s.includes("iphone") || s.includes("ipad")) os = "iOS";
  else if (s.includes("linux")) os = "Linux";

  return os ? `${os} · ${browser}` : browser;
}

export function timelineFromIso(focus: "last24h" | "last7d" | "last30d"): string {
  const now = Date.now();
  const hours =
    focus === "last24h" ? 24 : focus === "last7d" ? 24 * 7 : 24 * 30;
  return new Date(now - hours * 3600000).toISOString();
}

export function presetToQuery(preset: AuditPresetId): {
  module?: string;
  action?: string;
  from?: string;
} {
  switch (preset) {
    case "failedLogins":
      return { action: "failed" };
    case "criticalShipping":
      return { module: "shipping" };
    case "last24h":
      return { from: timelineFromIso("last24h") };
    default:
      return {};
  }
}

export const KNOWN_AUDIT_MODULES = [
  "orders",
  "products",
  "customers",
  "discounts",
  "shipping",
  "settings",
  "roles",
  "templates",
  "invoices",
  "payments",
  "auth",
  "notifications",
  "media",
  "cms",
] as const;

export function buildAuditCsv(
  rows: AuditLogRow[],
  formatRow: (log: AuditLogRow) => {
    action: string;
    module: string;
    severity: string;
  },
): string {
  const headers = [
    "id",
    "created_at",
    "actor_email",
    "actor_role",
    "action",
    "module",
    "severity",
    "entity_id",
    "ip",
    "user_agent",
  ];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((log) => {
      const f = formatRow(log);
      return [
        log.id,
        log.created_at,
        log.actor_email ?? "",
        log.actor_role ?? "",
        f.action,
        f.module,
        f.severity,
        log.entity_id ?? "",
        log.ip ?? "",
        log.user_agent ?? "",
      ]
        .map(escape)
        .join(",");
    }),
  ];
  return "\uFEFF" + lines.join("\n");
}
