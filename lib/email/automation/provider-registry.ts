import type { EmailProviderId, ProviderSendResult, SendEmailPayload } from "@/lib/email/automation/types";
import { sendViaResend, isResendProviderAvailable } from "@/lib/email/automation/providers/resend-provider";
import { sendViaSmtp, isSmtpProviderAvailable } from "@/lib/email/automation/providers/smtp-provider";
import {
  sendViaMailgun,
  sendViaSendGrid,
  sendViaSes,
} from "@/lib/email/automation/providers/api-providers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DEFAULT_PRIORITY: EmailProviderId[] = ["resend", "smtp", "sendgrid", "mailgun", "ses"];

export function parseProviderPriority(env?: string): EmailProviderId[] {
  const raw = env ?? process.env.EMAIL_PROVIDER_PRIORITY ?? "";
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as EmailProviderId[];
  return list.length ? list : DEFAULT_PRIORITY;
}

export async function loadProviderPriority(): Promise<EmailProviderId[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("email_provider_settings")
      .select("provider_priority, active_provider")
      .limit(1)
      .maybeSingle();
    if (data?.provider_priority?.length) {
      const priority = data.provider_priority as EmailProviderId[];
      const active = data.active_provider as EmailProviderId;
      if (active && priority.includes(active)) {
        return [active, ...priority.filter((p) => p !== active)];
      }
      return priority;
    }
  } catch {
    /* table may not exist yet */
  }
  return parseProviderPriority();
}

export function isProviderConfigured(id: EmailProviderId): boolean {
  switch (id) {
    case "resend":
      return isResendProviderAvailable();
    case "smtp":
    case "gmail":
    case "outlook":
      return isSmtpProviderAvailable();
    case "sendgrid":
      return Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL);
    case "mailgun":
      return Boolean(
        process.env.MAILGUN_API_KEY &&
          process.env.MAILGUN_DOMAIN &&
          process.env.MAILGUN_FROM_EMAIL,
      );
    case "ses":
      return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SES_FROM_EMAIL);
    default:
      return false;
  }
}

export async function sendWithProvider(
  provider: EmailProviderId,
  payload: SendEmailPayload,
): Promise<ProviderSendResult> {
  switch (provider) {
    case "resend":
      return sendViaResend(payload);
    case "smtp":
    case "gmail":
    case "outlook":
      return sendViaSmtp(payload);
    case "sendgrid":
      return sendViaSendGrid(payload);
    case "mailgun":
      return sendViaMailgun(payload);
    case "ses":
      return sendViaSes(payload);
    default:
      return { ok: false, provider, error: `Unknown provider: ${provider}` };
  }
}

/** Try providers in order until one succeeds. */
export async function sendWithFallback(
  payload: SendEmailPayload,
  priority?: EmailProviderId[],
): Promise<ProviderSendResult & { attempted: EmailProviderId[] }> {
  const order = priority ?? (await loadProviderPriority());
  const attempted: EmailProviderId[] = [];
  let lastError = "no_providers";

  for (const provider of order) {
    if (!isProviderConfigured(provider)) continue;
    attempted.push(provider);
    const result = await sendWithProvider(provider, payload);
    if (result.ok) return { ...result, attempted };
    lastError = result.error ?? "failed";
  }

  return {
    ok: false,
    provider: order[0] ?? "resend",
    error: lastError,
    attempted,
  };
}
