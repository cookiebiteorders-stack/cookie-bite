import { EMAIL_CONFIG } from "@/lib/email/resend";
import type { EmailProviderId } from "@/lib/email/automation/types";
import { checkResendHealth } from "@/lib/email/automation/providers/resend-provider";
import { checkSmtpHealth } from "@/lib/email/automation/providers/smtp-provider";
import {
  isProviderConfigured,
  loadProviderPriority,
  parseProviderPriority,
} from "@/lib/email/automation/provider-registry";
import { writeProviderHealth, switchActiveProvider } from "@/lib/email/automation/db";
import { sendAutomatedEmailNow } from "@/lib/email/automation/pipeline";

async function checkDnsViaPython(domain: string): Promise<{
  spf?: boolean;
  dkim?: boolean;
  dmarc?: boolean;
}> {
  const base = process.env.PYTHON_API_URL?.trim().replace(/\/$/, "");
  if (!base) return {};
  try {
    const res = await fetch(`${base}/email/validate-dns?domain=${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      spf_ok?: boolean;
      dkim_ok?: boolean;
      dmarc_ok?: boolean;
    };
    return {
      spf: data.spf_ok,
      dkim: data.dkim_ok,
      dmarc: data.dmarc_ok,
    };
  } catch {
    return {};
  }
}

async function checkProviderHealth(provider: EmailProviderId) {
  let status: "healthy" | "degraded" | "down" = "down";
  let latencyMs: number | undefined;
  let error: string | undefined;

  if (!isProviderConfigured(provider)) {
    return { provider, status: "down" as const, error: "not_configured" };
  }

  if (provider === "resend") {
    const h = await checkResendHealth();
    status = h.status;
    latencyMs = h.latencyMs;
    error = h.error;
  } else if (["smtp", "gmail", "outlook"].includes(provider)) {
    const h = await checkSmtpHealth();
    status = h.status;
    latencyMs = h.latencyMs;
    error = h.error;
  } else if (provider === "sendgrid" && process.env.SENDGRID_API_KEY) {
    const start = Date.now();
    const res = await fetch("https://api.sendgrid.com/v3/user/profile", {
      headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` },
      signal: AbortSignal.timeout(8_000),
    });
    latencyMs = Date.now() - start;
    status = res.ok ? "healthy" : "degraded";
    if (!res.ok) error = `HTTP ${res.status}`;
  } else if (provider === "mailgun" && process.env.MAILGUN_API_KEY) {
    status = "healthy";
  } else {
    status = "degraded";
    error = "health_probe_not_implemented";
  }

  const dns =
    provider === "resend" ? await checkDnsViaPython(EMAIL_CONFIG.domain) : {};

  await writeProviderHealth({
    provider,
    status,
    latencyMs,
    errorMessage: error,
    dns,
  });

  return { provider, status, latencyMs, error, dns };
}

export async function runEmailHealthChecks(): Promise<{
  providers: Awaited<ReturnType<typeof checkProviderHealth>>[];
  switchedTo?: EmailProviderId;
}> {
  const priority = await loadProviderPriority();
  const results = await Promise.all(priority.map((p) => checkProviderHealth(p)));

  const healthy = results.find((r) => r.status === "healthy");
  const primary = priority[0];
  const primaryResult = results.find((r) => r.provider === primary);

  let switchedTo: EmailProviderId | undefined;
  if (primaryResult && primaryResult.status === "down" && healthy && healthy.provider !== primary) {
    await switchActiveProvider(healthy.provider);
    switchedTo = healthy.provider;
  }

  return { providers: results, switchedTo };
}

export async function sendHealthCheckEmail(to: string): Promise<{ ok: boolean; error?: string }> {
  const result = await sendAutomatedEmailNow({
    to,
    subject: `Cookie Bite — Email health test ${new Date().toISOString()}`,
    html: `<p>Automated health-check email. If you received this, outbound delivery is working.</p>`,
    emailType: "test",
    immediate: true,
    metadata: { healthCheck: true },
  });
  return { ok: result.ok, error: result.error };
}

export async function runFullHealthCycle(options?: { sendTest?: boolean; testRecipient?: string }) {
  const checks = await runEmailHealthChecks();
  let testSend: { ok: boolean; error?: string } | undefined;

  const sendTest = options?.sendTest === true;
  const to = options?.testRecipient?.trim();
  if (sendTest && to) {
    testSend = await sendHealthCheckEmail(to);
  }

  return { ...checks, testSend };
}
