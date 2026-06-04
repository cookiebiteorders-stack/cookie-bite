import type { SendEmailPayload } from "@/lib/email/automation/types";
import { sendWithFallback } from "@/lib/email/automation/provider-registry";
import {
  insertEmailQueue,
  updateQueueStatus,
  writeEmailLog,
  writeFailedEmail,
} from "@/lib/email/automation/db";
import { processEmailQueueRow } from "@/lib/email/automation/process-job";
import { isSmartRetriesEnabled } from "@/lib/store/owner-flags";
import {
  isEmailDbQueueEnabled,
  isEmailQueueEnabled,
} from "@/lib/email/automation/queue-config";

const USE_QUEUE = isEmailQueueEnabled();

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
  const { addEmailBullJob } = await import("@/lib/email/automation/bull-queue");
  const bullOk = await addEmailBullJob(queueId);
  if (!bullOk && isEmailDbQueueEnabled()) {
    /* DB cron أو «عامل طابور البريد» في مركز الأتمتة */
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
      userId: payload.userId,
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
  const smartRetries = await isSmartRetriesEnabled();
  if (queueId) {
    const attempts = 1;
    await updateQueueStatus(queueId, {
      status: "failed",
      attempts,
      error_summary: err,
      ...(smartRetries
        ? { next_retry_at: new Date(Date.now() + retryDelayMs(attempts)).toISOString() }
        : {}),
    });
  }
  await writeFailedEmail({
    queueId: queueId ?? null,
    recipient: payload.to,
    subject: payload.subject,
    provider: result.provider,
    errorMessage: err,
    ...(smartRetries
      ? { nextRetryAt: new Date(Date.now() + retryDelayMs(1)).toISOString() }
      : {}),
    payload: { html: payload.html.slice(0, 500) },
  });
  await writeEmailLog({
    queueId: queueId ?? null,
    recipient: payload.to,
    subject: payload.subject,
    emailType: payload.emailType ?? "transactional",
    userId: payload.userId,
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
