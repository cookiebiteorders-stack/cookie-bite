import { EMAIL_CONFIG, getResend, isEmailConfigured } from "@/lib/email/resend";
import type { ProviderSendResult, SendEmailPayload } from "@/lib/email/automation/types";

export function isResendProviderAvailable(): boolean {
  return isEmailConfigured();
}

export async function sendViaResend(payload: SendEmailPayload): Promise<ProviderSendResult> {
  const start = Date.now();
  if (!isResendProviderAvailable()) {
    return { ok: false, provider: "resend", error: "RESEND_API_KEY not configured" };
  }
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: payload.to,
      replyTo: payload.replyTo ?? EMAIL_CONFIG.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: payload.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    const messageId =
      (result as { data?: { id?: string } })?.data?.id ??
      (result as { id?: string })?.id;
    return {
      ok: true,
      provider: "resend",
      messageId,
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return {
      ok: false,
      provider: "resend",
      error: e instanceof Error ? e.message : "Resend send failed",
      latencyMs: Date.now() - start,
    };
  }
}

export async function checkResendHealth(): Promise<{
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  if (!isResendProviderAvailable()) {
    return { status: "down", error: "not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      signal: AbortSignal.timeout(8_000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { status: "degraded", latencyMs, error: `HTTP ${res.status}` };
    }
    return { status: "healthy", latencyMs };
  } catch (e) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : "health_check_failed",
    };
  }
}
