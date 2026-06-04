/** Automation jobs — same processors as cron routes, runnable from admin. */

export type AutomationJobId =
  | "notification_jobs"
  | "email_worker"
  | "email_health"
  | "abandoned_cart";

export type AutomationJobDef = {
  id: AutomationJobId;
  labelKey: string;
  descKey: string;
  triggerKey: string;
  cronPath: string;
  scheduleKey: string;
};

export const AUTOMATION_JOBS: AutomationJobDef[] = [
  {
    id: "notification_jobs",
    labelKey: "settings.automation.jobs.notificationJobs",
    descKey: "settings.automation.jobs.notificationJobsDesc",
    triggerKey: "settings.automation.triggers.orderPayment",
    cronPath: "/api/cron/notification-jobs",
    scheduleKey: "settings.automation.schedule.every5m",
  },
  {
    id: "email_worker",
    labelKey: "settings.automation.jobs.emailWorker",
    descKey: "settings.automation.jobs.emailWorkerDesc",
    triggerKey: "settings.automation.triggers.emailQueue",
    cronPath: "/api/cron/email-worker",
    scheduleKey: "settings.automation.schedule.every5m",
  },
  {
    id: "email_health",
    labelKey: "settings.automation.jobs.emailHealth",
    descKey: "settings.automation.jobs.emailHealthDesc",
    triggerKey: "settings.automation.triggers.providerHealth",
    cronPath: "/api/cron/email-health",
    scheduleKey: "settings.automation.schedule.every10m",
  },
  {
    id: "abandoned_cart",
    labelKey: "settings.automation.jobs.abandonedCart",
    descKey: "settings.automation.jobs.abandonedCartDesc",
    triggerKey: "settings.automation.triggers.cartIdle",
    cronPath: "/api/cron/abandoned-cart-reminders",
    scheduleKey: "settings.automation.schedule.hourly",
  },
];

export const AUTOMATION_PIPELINES = [
  {
    id: "order_confirm",
    labelKey: "settings.automation.pipelines.orderConfirm",
    triggerKey: "settings.automation.pipelineTriggers.orderConfirm",
    channelsKey: "settings.automation.pipelineChannels.orderConfirm",
  },
  {
    id: "payment_confirm",
    labelKey: "settings.automation.pipelines.paymentConfirm",
    triggerKey: "settings.automation.pipelineTriggers.paymentConfirm",
    channelsKey: "settings.automation.pipelineChannels.paymentConfirm",
  },
  {
    id: "order_created_event",
    labelKey: "settings.automation.pipelines.orderCreatedEmail",
    triggerKey: "settings.automation.pipelineTriggers.orderCreatedEmail",
    channelsKey: "settings.automation.pipelineChannels.orderCreatedEmail",
  },
  {
    id: "order_shipped",
    labelKey: "settings.automation.pipelines.orderShipped",
    triggerKey: "settings.automation.pipelineTriggers.orderShipped",
    channelsKey: "settings.automation.pipelineChannels.orderShipped",
  },
] as const;

export function isAutomationJobId(value: string): value is AutomationJobId {
  return AUTOMATION_JOBS.some((j) => j.id === value);
}
