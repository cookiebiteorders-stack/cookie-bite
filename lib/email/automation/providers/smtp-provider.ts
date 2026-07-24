import type { ProviderSendResult, SendEmailPayload } from "@/lib/email/automation/types";
import { decryptSecret } from "@/lib/email/automation/crypto";

export type SmtpConfigRow = {
  id: string;
  host: string | null;
  port: number | null;
  secure: boolean;
  username: string | null;
  password_encrypted: string | null;
  from_email: string;
  from_name: string | null;
  provider_type: string;
};

function smtpFromEnv(): SmtpConfigRow | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() ?? process.env.SMTP_USER?.trim();
  if (!host || !user || !pass || !from) return null;
  return {
    id: "env",
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    username: user,
    password_encrypted: pass,
    from_email: from,
    from_name: process.env.SMTP_FROM_NAME ?? "Cookie Bite",
    provider_type: "smtp",
  };
}

export function isSmtpProviderAvailable(config?: SmtpConfigRow | null): boolean {
  return Boolean(config ?? smtpFromEnv());
}

async function createTransport(config: SmtpConfigRow) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodemailerMod = await import("nodemailer") as any;
  const password = config.password_encrypted?.startsWith("v1:")
    ? decryptSecret(config.password_encrypted)
    : (config.password_encrypted ?? "");
  return nodemailerMod.createTransport({
    host: config.host!,
    port: config.port ?? 587,
    secure: config.secure,
    auth: config.username ? { user: config.username, pass: password } : undefined,
  });
}

export async function sendViaSmtp(
  payload: SendEmailPayload,
  config?: SmtpConfigRow | null,
): Promise<ProviderSendResult> {
  const start = Date.now();
  const cfg = config ?? smtpFromEnv();
  if (!cfg?.host) {
    return { ok: false, provider: "smtp", error: "SMTP not configured" };
  }
  try {
    const transport = await createTransport(cfg);
    const from = cfg.from_name
      ? `${cfg.from_name} <${cfg.from_email}>`
      : cfg.from_email;
    const info = await transport.sendMail({
      from,
      to: payload.to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: payload.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    await transport.close();
    return {
      ok: true,
      provider: "smtp",
      messageId: info.messageId,
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return {
      ok: false,
      provider: "smtp",
      error: e instanceof Error ? e.message : "SMTP send failed",
      latencyMs: Date.now() - start,
    };
  }
}

export async function checkSmtpHealth(config?: SmtpConfigRow | null): Promise<{
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  const cfg = config ?? smtpFromEnv();
  if (!cfg?.host) return { status: "down", error: "not_configured" };
  try {
    const transport = await createTransport(cfg);
    await transport.verify();
    await transport.close();
    return { status: "healthy", latencyMs: Date.now() - start };
  } catch (e) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : "verify_failed",
    };
  }
}

export { smtpFromEnv };
