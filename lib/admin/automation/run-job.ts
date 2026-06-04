import type { AutomationJobId } from "@/lib/admin/automation/registry";
import { processAbandonedCartReminders } from "@/lib/cart/abandoned-reminders";
import { drainEmailBullJobs } from "@/lib/email/automation/bull-queue";
import { drainEmailQueue } from "@/lib/email/automation/pipeline";
import { requeueFailedEmails, runSelfHealCycle } from "@/lib/email/automation/self-heal";
import { drainBullNotificationJobs } from "@/lib/notifications/bull-queue";
import { processPendingNotificationJobs } from "@/lib/notifications/schedule";

export async function runAutomationJob(
  jobId: AutomationJobId,
  limit = 25,
): Promise<Record<string, unknown>> {
  switch (jobId) {
    case "notification_jobs": {
      const [database, bull] = await Promise.all([
        processPendingNotificationJobs(limit),
        drainBullNotificationJobs(limit),
      ]);
      return { processed: { database, bull } };
    }
    case "email_worker": {
      const [database, bull, requeued] = await Promise.all([
        drainEmailQueue(limit),
        drainEmailBullJobs(limit),
        requeueFailedEmails(Math.floor(limit / 2)),
      ]);
      return { processed: { database, bull, requeued } };
    }
    case "email_health": {
      const result = await runSelfHealCycle();
      return { ...result };
    }
    case "abandoned_cart": {
      const processed = await processAbandonedCartReminders();
      return { processed };
    }
    default:
      return { error: "unknown_job" };
  }
}
