import { createSupabaseAdminClient, tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type BlockedEmailRow = {
  email: string;
  reason: string | null;
  blocked_by_user_id: string | null;
  blocked_by_email: string | null;
  customer_user_id: string | null;
  blocked_at: string;
};

export function normalizeBlockedEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function isEmailBlocked(email: string): Promise<boolean> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return false;
  const normalized = normalizeBlockedEmail(email);
  const { data, error } = await supabase
    .from("blocked_emails")
    .select("email")
    .eq("email", normalized)
    .maybeSingle();
  if (error) {
    console.error("isEmailBlocked error", error);
    return false;
  }
  return Boolean(data);
}

export async function getBlockedEmail(
  email: string,
): Promise<BlockedEmailRow | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("blocked_emails")
    .select("*")
    .eq("email", normalizeBlockedEmail(email))
    .maybeSingle();
  if (error) {
    console.error("getBlockedEmail error", error);
    return null;
  }
  return (data as BlockedEmailRow | null) ?? null;
}

export async function blockEmail(input: {
  email: string;
  reason?: string | null;
  blockedByUserId?: string | null;
  blockedByEmail?: string | null;
  customerUserId?: string | null;
}): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const row = {
    email: normalizeBlockedEmail(input.email),
    reason: input.reason?.trim() || null,
    blocked_by_user_id: input.blockedByUserId ?? null,
    blocked_by_email: input.blockedByEmail ?? null,
    customer_user_id: input.customerUserId ?? null,
    blocked_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("blocked_emails").upsert(row, {
    onConflict: "email",
  });
  if (error) {
    console.error("blockEmail error", error);
    return false;
  }
  return true;
}

export async function unblockEmail(email: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("blocked_emails")
    .delete()
    .eq("email", normalizeBlockedEmail(email));
  if (error) {
    console.error("unblockEmail error", error);
    return false;
  }
  return true;
}
