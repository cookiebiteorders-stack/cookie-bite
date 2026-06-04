import { EMAIL_CONFIG } from "@/lib/email/resend";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

const DEFAULT_OWNER_EMAIL = "cookie.bite.orders@gmail.com";
/** البريد الافتراضي لعمليات المتجر — يستقبل كل تنبيهات الطلبات. */
export const DEFAULT_STORE_OPS_EMAIL = "cookie-bite@cookie-bite.com";

function storeOpsInbox(): string {
  return EMAIL_CONFIG.inbox.toLowerCase();
}

function parseCsv(input?: string): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Every inbox that should receive internal alerts (new customers, etc.).
 * DB `users` with role owner/admin, plus bootstrap emails from env.
 */
export async function listOwnerAndAdminEmails(): Promise<string[]> {
  const emails = new Set<string>();

  const ops = storeOpsInbox();
  if (ops) emails.add(ops);

  const owner = (process.env.OWNER_BOOTSTRAP_EMAIL || DEFAULT_OWNER_EMAIL)
    .trim()
    .toLowerCase();
  if (owner) emails.add(owner);

  for (const e of parseCsv(process.env.ADMIN_BOOTSTRAP_EMAILS)) {
    emails.add(e);
  }

  const supabase = tryCreateSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("users")
      .select("email")
      .in("role", ["owner", "admin"]);
    if (error) {
      console.error("[staff-recipients] list owner/admin", error.message);
    } else {
      for (const row of data ?? []) {
        const normalized = (row.email ?? "").trim().toLowerCase();
        if (normalized) emails.add(normalized);
      }
    }
  }

  return [...emails];
}
