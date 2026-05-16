import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  NotificationChannel,
  NotificationLogStatus,
  NotificationType,
} from "@/lib/notifications/types";

export async function hasSuccessfulNotification(params: {
  orderId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  recipient?: string;
}): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return false;
  }
  const supabase = createSupabaseAdminClient();
  let q = supabase
    .from("notification_logs")
    .select("id")
    .eq("order_id", params.orderId)
    .eq("notification_type", params.notificationType)
    .eq("channel", params.channel)
    .eq("status", "sent")
    .limit(1);
  if (params.recipient) {
    q = q.eq("recipient", params.recipient);
  }
  const { data, error } = await q.maybeSingle();
  if (error) {
    console.error("[notification_logs] dedupe check", error.message);
    return false;
  }
  return Boolean(data);
}

export async function writeNotificationLog(params: {
  orderId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  status: NotificationLogStatus;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return;
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("notification_logs").insert({
    order_id: params.orderId,
    notification_type: params.notificationType,
    channel: params.channel,
    recipient: params.recipient,
    status: params.status,
    error_message: params.errorMessage ?? null,
    metadata: params.metadata ?? {},
    sent_at: params.status === "sent" ? new Date().toISOString() : null,
  });
  if (error) {
    console.error("[notification_logs] insert", error.message);
  }
}

export async function listNotificationLogsForOrder(orderId: string, limit = 30) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return [];
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notification_logs")
    .select(
      "id, notification_type, channel, recipient, status, error_message, sent_at, created_at",
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[notification_logs] list", error.message);
    return [];
  }
  return data ?? [];
}
