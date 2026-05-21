import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

const DEFAULT_OWNER_EMAIL = "cookie.bite.orders@gmail.com";

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
