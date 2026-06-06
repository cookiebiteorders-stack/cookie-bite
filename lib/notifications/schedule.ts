import {
  dispatchOrderConfirmed,
  dispatchPaymentConfirmed,
  dispatchReviewRequest,
  type DispatchOptions,
} from "@/lib/notifications/orchestrator";
import {
  addBullNotificationJob,
} from "@/lib/notifications/bull-queue";
import {
  claimPendingNotificationJobs,
  completeNotificationJob,
  enqueueNotificationJob,
  hasReviewRequestJobForOrder,
  reviewRequestScheduledAt,
  type NotificationJobType,
} from "@/lib/notifications/db-queue";

async function runJob(
  jobType: NotificationJobType,
  orderId: string,
  options?: DispatchOptions,
) {
  if (jobType === "order_confirmation") {
    return dispatchOrderConfirmed(orderId, options);
  }
  if (jobType === "payment_confirmation") {
    return dispatchPaymentConfirmed(orderId, options);
  }
  return dispatchReviewRequest(orderId, options);
}

/**
 * Schedules order/payment notifications:
 * 1. Bull + Redis when REDIS_URL is set
 * 2. Else DB queue + Next.js `after()` for async within the request
 * 3. Else immediate fire-and-forget
 */
export function scheduleOrderConfirmed(orderId: string, options?: DispatchOptions): void {
  void scheduleNotification("order_confirmation", orderId, options);
}

export function schedulePaymentConfirmed(orderId: string, options?: DispatchOptions): void {
  void scheduleNotification("payment_confirmation", orderId, options);
}

/** Schedule review-request email 3 days after delivery (DB queue only — delayed). */
export async function scheduleReviewRequest(orderId: string): Promise<void> {
  if (await hasReviewRequestJobForOrder(orderId)) return;

  const scheduledAt = reviewRequestScheduledAt();
  await enqueueNotificationJob({
    jobType: "review_request",
    orderId,
    scheduledAt,
  });
}

async function scheduleNotification(
  jobType: NotificationJobType,
  orderId: string,
  options?: DispatchOptions,
): Promise<void> {
  const bullOk = await addBullNotificationJob(jobType, orderId, options);
  if (bullOk) return;

  const jobId = await enqueueNotificationJob({ jobType, orderId, options });

  const execute = async () => {
    try {
      const result = await runJob(jobType, orderId, options);
      if (jobId) {
        await completeNotificationJob(jobId, result.ok, result.errors?.join("; "));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "job_failed";
      if (jobId) await completeNotificationJob(jobId, false, msg);
      console.error(`[notifications] ${jobType}`, e);
    }
  };

  try {
    const { after } = await import("next/server");
    after(execute);
  } catch {
    void execute();
  }
}

/** Process pending rows in notification_jobs (cron / manual). */
export async function processPendingNotificationJobs(limit = 10): Promise<number> {
  const jobs = await claimPendingNotificationJobs(limit);
  let done = 0;
  for (const job of jobs) {
    const payload = (job.payload ?? {}) as { force?: boolean };
    try {
      const result = await runJob(
        job.job_type as NotificationJobType,
        job.order_id as string,
        { force: payload.force },
      );
      await completeNotificationJob(job.id as string, result.ok, result.errors?.join("; "));
      done += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "job_failed";
      await completeNotificationJob(job.id as string, false, msg);
    }
  }
  return done;
}
