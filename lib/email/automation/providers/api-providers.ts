import type { ProviderSendResult, SendEmailPayload } from "@/lib/email/automation/types";

export async function sendViaSendGrid(payload: SendEmailPayload): Promise<ProviderSendResult> {
  const key = process.env.SENDGRID_API_KEY?.trim();
  const from = process.env.SENDGRID_FROM_EMAIL?.trim();
  if (!key || !from) {
    return { ok: false, provider: "sendgrid", error: "SendGrid not configured" };
  }
  const start = Date.now();
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }],
        from: { email: from },
        subject: payload.subject,
        content: [
          { type: "text/html", value: payload.html },
          ...(payload.text ? [{ type: "text/plain", value: payload.text }] : []),
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, provider: "sendgrid", error: err || `HTTP ${res.status}`, latencyMs: Date.now() - start };
    }
    const messageId = res.headers.get("x-message-id") ?? undefined;
    return { ok: true, provider: "sendgrid", messageId, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      ok: false,
      provider: "sendgrid",
      error: e instanceof Error ? e.message : "sendgrid_failed",
      latencyMs: Date.now() - start,
    };
  }
}

export async function sendViaMailgun(payload: SendEmailPayload): Promise<ProviderSendResult> {
  const key = process.env.MAILGUN_API_KEY?.trim();
  const domain = process.env.MAILGUN_DOMAIN?.trim();
  const from = process.env.MAILGUN_FROM_EMAIL?.trim();
  if (!key || !domain || !from) {
    return { ok: false, provider: "mailgun", error: "Mailgun not configured" };
  }
  const start = Date.now();
  try {
    const body = new URLSearchParams({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    if (payload.text) body.set("text", payload.text);
    const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${key}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(30_000),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      return {
        ok: false,
        provider: "mailgun",
        error: json.message ?? `HTTP ${res.status}`,
        latencyMs: Date.now() - start,
      };
    }
    return {
      ok: true,
      provider: "mailgun",
      messageId: json.id,
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return {
      ok: false,
      provider: "mailgun",
      error: e instanceof Error ? e.message : "mailgun_failed",
      latencyMs: Date.now() - start,
    };
  }
}

export async function sendViaSes(payload: SendEmailPayload): Promise<ProviderSendResult> {
  const key = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secret = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const region = process.env.AWS_SES_REGION?.trim() ?? "eu-west-1";
  const from = process.env.AWS_SES_FROM_EMAIL?.trim();
  if (!key || !secret || !from) {
    return { ok: false, provider: "ses", error: "Amazon SES not configured (use SMTP relay or add SDK)" };
  }
  return {
    ok: false,
    provider: "ses",
    error: "SES direct API not enabled — configure SMTP relay for SES instead",
  };
}
