import { sendWithFallback } from "@/lib/email/automation/provider-registry";
import {
  updateQueueStatus,
  writeEmailLog,
  writeFailedEmail,
} from "@/lib/email/automation/db";
import { isSmartRetriesEnabled } from "@/lib/store/owner-flags";
import type { SendEmailPayload } from "@/lib/email/automation/types";

function retryDelayMs(attempt: number): number {
  return Math.min(3600_000, 30_000 * 2 ** attempt);
}

export async function processEmailQueueRow(row: Record<string, unknown>): Promise<void> {
  const id = row.id as string;
  const attempts = ((row.attempts as number) ?? 0) + 1;
  const maxAttempts = (row.max_attempts as number) ?? 5;

  await updateQueueStatus(id, { status: "processing", attempts });

  const payload: SendEmailPayload = {
    to: row.recipient as string,
    subject: row.subject as string,
    html: row.html_body as string,
    text: (row.text_body as string) ?? undefined,
    emailType: (row.email_type as SendEmailPayload["emailType"]) ?? "transactional",
    templateKey: (row.template_key as string) ?? undefined,
    variables: (row.variables as Record<string, unknown>) ?? {},
    orderId: (row.order_id as string) ?? undefined,
    userId: (row.user_id as string) ?? undefined,
    immediate: true,
  };

  const result = await sendWithFallback(payload);

  if (result.ok) {
    await updateQueueStatus(id, {
      status: "sent",
      provider: result.provider,
      provider_message_id: result.messageId ?? undefined,
      sent_at: new Date().toISOString(),
    });
    await writeEmailLog({
      queueId: id,
      recipient: payload.to,
      subject: payload.subject,
      emailType: payload.emailType ?? "transactional",
      templateKey: payload.templateKey,
      userId: payload.userId,
      provider: result.provider,
      providerMessageId: result.messageId,
      status: "sent",
      orderId: payload.orderId,
    });
    return;
  }

  const err = result.error ?? "failed";
  const smartRetries = await isSmartRetriesEnabled();
  if (attempts >= maxAttempts || !smartRetries) {
    await updateQueueStatus(id, { status: "failed", error_summary: err });
    await writeFailedEmail({
      queueId: id,
      recipient: payload.to,
      subject: payload.subject,
      provider: result.provider,
      errorMessage: err,
      retryCount: attempts,
    });
  } else {
    await updateQueueStatus(id, {
      status: "failed",
      error_summary: err,
      next_retry_at: new Date(Date.now() + retryDelayMs(attempts)).toISOString(),
    });
  }
  await writeEmailLog({
    queueId: id,
    recipient: payload.to,
    subject: payload.subject,
    emailType: payload.emailType ?? "transactional",
    userId: payload.userId,
    provider: result.attempted[0] ?? "resend",
    status: "failed",
    metadata: { error: err },
  });
}
