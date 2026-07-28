import { onUserRegistered } from "@/lib/email/automation/triggers";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

const WELCOME_RETRY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type WelcomeEmailSendOpts = {
  userId: string;
  to: string;
  name?: string;
  /** Skip age window — use for brand-new rows (webhook / first account upsert). */
  force?: boolean;
  createdAt?: string;
};

/**
 * Sends the welcome email at most once per user row.
 * Uses `welcome_email_sent_at` as a claim; rolls back on Resend failure.
 */
export async function trySendWelcomeEmailOnce(
  opts: WelcomeEmailSendOpts,
): Promise<{ sent: boolean; reason?: string }> {
  if (!opts.force && opts.createdAt) {
    const age = Date.now() - new Date(opts.createdAt).getTime();
    if (age > WELCOME_RETRY_WINDOW_MS) {
      return { sent: false, reason: "account_too_old" };
    }
  }

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return { sent: false, reason: "no_supabase" };

  const { data: claimed, error: claimError } = await supabase
    .from("profiles")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq("id", opts.userId)
    .is("welcome_email_sent_at", null)
    .select("id")
    .maybeSingle();

  if (claimError) {
    console.error("trySendWelcomeEmailOnce claim failed", claimError);
    return { sent: false, reason: "claim_error" };
  }
  if (!claimed) return { sent: false, reason: "already_sent" };

  try {
    const result = await onUserRegistered({
      email: opts.to,
      userId: opts.userId,
      userName: opts.name,
    });
    if (!result.ok && !result.skipped) {
      throw new Error(result.reason ?? "welcome_automation_failed");
    }
    return { sent: true };
  } catch (err) {
    await supabase
      .from("profiles")
      .update({ welcome_email_sent_at: null })
      .eq("id", opts.userId);
    throw err;
  }
}
