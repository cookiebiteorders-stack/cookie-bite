import type { SendEmailPayload } from "@/lib/email/automation/types";
import { sendWithFallback } from "@/lib/email/automation/provider-registry";
import {
  insertEmailQueue,
  updateQueueStatus,
  writeEmailLog,
  writeFailedEmail,
} from "@/lib/email/automation/db";
import { addEmailBullJob } from "@/lib/email/automation/bull-queue";
import { processEmailQueueRow } from "@/lib/email/automation/process-job";

const USE_QUEUE =
  process.env.EMAIL_USE_QUEUE !== "false" &&
  Boolean(process.env.REDIS_URL?.trim() || process.env.EMAIL_USE_DB_QUEUE === "true");

function retryDelayMs(attempt: number): number {
  return Math.min(3600_000, 30_000 * 2 ** attempt);
}

/**
 * Unified email send — queues when configured, otherwise sends with provider fallback.
 */
export async function sendAutomatedEmail(
  payload: SendEmailPayload,
): Promise<{ ok: boolean; queueId?: string; messageId?: string; provider?: string; error?: string }> {
  if (payload.immediate || !USE_QUEUE) {
    return sendAutomatedEmailNow(payload);
  }

  const queueId = await insertEmailQueue(payload);
  const bullOk = await addEmailBullJob(queueId);
  if (!bullOk && process.env.EMAIL_USE_DB_QUEUE === "true") {
    /* DB cron will pick up pending rows */
  } else if (!bullOk) {
    return sendAutomatedEmailNow({ ...payload, metadata: { ...payload.metadata, queueId } });
  }
  return { ok: true, queueId };
}

export async function sendAutomatedEmailNow(
  payload: SendEmailPayload & { metadata?: Record<string, unknown> },
): Promise<{ ok: boolean; queueId?: string; messageId?: string; provider?: string; error?: string }> {
  const queueId =
    (payload.metadata?.queueId as string | undefined) ??
    (await insertEmailQueue(payload).catch(() => undefined));

  if (queueId) {
    await updateQueueStatus(queueId, { status: "processing" });
  }

  const result = await sendWithFallback(payload);

  if (result.ok) {
    if (queueId) {
      await updateQueueStatus(queueId, {
        status: "sent",
        provider: result.provider,
        provider_message_id: result.messageId ?? undefined,
        sent_at: new Date().toISOString(),
      });
    }
    await writeEmailLog({
      queueId: queueId ?? null,
      recipient: payload.to,
      subject: payload.subject,
      emailType: payload.emailType ?? "transactional",
      templateKey: payload.templateKey,
      provider: result.provider,
      providerMessageId: result.messageId,
      status: "sent",
      orderId: payload.orderId,
      metadata: { attempted: result.attempted, latencyMs: result.latencyMs },
    });
    return {
      ok: true,
      queueId,
      messageId: result.messageId,
      provider: result.provider,
    };
  }

  const err = result.error ?? "all_providers_failed";
  if (queueId) {
    const attempts = 1;
    await updateQueueStatus(queueId, {
      status: "failed",
      attempts,
      error_summary: err,
      next_retry_at: new Date(Date.now() + retryDelayMs(attempts)).toISOString(),
    });
  }
  await writeFailedEmail({
    queueId: queueId ?? null,
    recipient: payload.to,
    subject: payload.subject,
    provider: result.provider,
    errorMessage: err,
    nextRetryAt: new Date(Date.now() + retryDelayMs(1)).toISOString(),
    payload: { html: payload.html.slice(0, 500) },
  });
  await writeEmailLog({
    queueId: queueId ?? null,
    recipient: payload.to,
    subject: payload.subject,
    emailType: payload.emailType ?? "transactional",
    provider: result.attempted[0] ?? "resend",
    status: "failed",
    orderId: payload.orderId,
    metadata: { error: err, attempted: result.attempted },
  });

  return { ok: false, queueId, error: err };
}

export async function drainEmailQueue(max = 15): Promise<number> {
  const { fetchPendingQueue } = await import("@/lib/email/automation/db");
  const rows = await fetchPendingQueue(max);
  let done = 0;
  for (const row of rows) {
    try {
      await processEmailQueueRow(row);
      done += 1;
    } catch (e) {
      console.error("[email-queue] row failed", row.id, e);
    }
  }
  return done;
}
