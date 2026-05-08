import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRole, ModuleKey } from "@/lib/admin/rbac";

/**
 * Cookie Bite — Audit Log helper.
 * - يكتب فقط ولا يقرأ.
 * - فشل الكتابة لا يُعطّل العملية الأصلية (best-effort).
 * - الجدول immutable على مستوى DB (سياسات RLS).
 */

export type AuditActor = {
  user_id: string | null;
  email: string | null;
  role: UserRole | "system";
};

export type AuditEntry = {
  actor: AuditActor;
  action: string;
  module: ModuleKey | "auth" | "system" | "payments" | "notifications";
  entity_id?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  request?: Request | null;
};

function pickIp(req: Request | null | undefined): string | null {
  if (!req) return null;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return null;
}

function pickUserAgent(req: Request | null | undefined): string | null {
  return req?.headers.get("user-agent") ?? null;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    const ip = pickIp(entry.request ?? null);
    const ua = pickUserAgent(entry.request ?? null);

    await supabase.from("audit_logs").insert({
      actor_id: entry.actor.user_id ?? null,
      actor_email: entry.actor.email ?? null,
      actor_role: entry.actor.role ?? "system",
      action: entry.action,
      module: entry.module,
      entity_id: entry.entity_id ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      metadata: entry.metadata ?? {},
      ip,
      user_agent: ua,
    });
  } catch (err) {
    // best-effort: never throw from audit
    console.error("audit_log write failed", err);
  }
}

export async function writeSystemAudit(
  action: AuditEntry["action"],
  module: AuditEntry["module"],
  payload: Omit<AuditEntry, "actor" | "action" | "module"> = {},
): Promise<void> {
  return writeAuditLog({
    actor: { user_id: null, email: null, role: "system" },
    action,
    module,
    ...payload,
  });
}
