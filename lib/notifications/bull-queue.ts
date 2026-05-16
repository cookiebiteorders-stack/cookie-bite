import type { DispatchOptions } from "@/lib/notifications/orchestrator";
import type { NotificationJobType } from "@/lib/notifications/db-queue";

const QUEUE_NAME = "cookie-bite-notifications";

type JobData = {
  jobType: NotificationJobType;
  orderId: string;
  options?: DispatchOptions;
};

let queuePromise: Promise<import("bullmq").Queue<JobData> | null> | null = null;

async function getQueue(): Promise<import("bullmq").Queue<JobData> | null> {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) return null;

  if (!queuePromise) {
    queuePromise = (async () => {
      const { Queue } = await import("bullmq");
      return new Queue<JobData>(QUEUE_NAME, { connection: { url: redisUrl } });
    })();
  }
  return queuePromise;
}

export async function addBullNotificationJob(
  jobType: NotificationJobType,
  orderId: string,
  options?: DispatchOptions,
): Promise<boolean> {
  const queue = await getQueue();
  if (!queue) return false;
  await queue.add(jobType, { jobType, orderId, options }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
  return true;
}

/** Drain waiting jobs (for cron when Redis is available). */
export async function drainBullNotificationJobs(max = 10): Promise<number> {
  const queue = await getQueue();
  if (!queue) return 0;

  const { dispatchOrderConfirmed, dispatchPaymentConfirmed } = await import(
    "@/lib/notifications/orchestrator"
  );

  const waiting = await queue.getJobs(["waiting", "delayed"], 0, max - 1);
  let done = 0;
  for (const job of waiting) {
    try {
      const { jobType, orderId, options } = job.data;
      if (jobType === "order_confirmation") {
        await dispatchOrderConfirmed(orderId, options);
      } else {
        await dispatchPaymentConfirmed(orderId, options);
      }
      await job.remove();
      done += 1;
    } catch (e) {
      console.error("[bull] job failed", job.id, e);
    }
  }
  return done;
}
