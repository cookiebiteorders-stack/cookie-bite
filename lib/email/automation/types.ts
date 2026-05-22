export type EmailProviderId =
  | "resend"
  | "smtp"
  | "sendgrid"
  | "mailgun"
  | "ses"
  | "gmail"
  | "outlook";

export type EmailQueueStatus = "pending" | "processing" | "sent" | "failed" | "cancelled";

export type EmailCategory =
  | "transactional"
  | "marketing"
  | "otp"
  | "invoice"
  | "notification"
  | "bulk"
  | "system"
  | "test";

export type SendEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  emailType?: EmailCategory;
  templateKey?: string;
  variables?: Record<string, unknown>;
  attachments?: Array<{ filename: string; content: string }>;
  orderId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  /** Skip queue — send immediately (OTP, critical). */
  immediate?: boolean;
  priority?: number;
};

export type ProviderSendResult = {
  ok: boolean;
  provider: EmailProviderId;
  messageId?: string;
  error?: string;
  latencyMs?: number;
};

export type ProviderHealthStatus = "healthy" | "degraded" | "down";

export type ProviderHealthResult = {
  provider: EmailProviderId;
  status: ProviderHealthStatus;
  latencyMs?: number;
  error?: string;
  dns?: { spf?: boolean; dkim?: boolean; dmarc?: boolean };
};
