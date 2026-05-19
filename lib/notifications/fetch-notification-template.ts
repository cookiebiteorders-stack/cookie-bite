import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type NotificationTemplateRow = {
  id: string;
  channel: string;
  key: string;
  language: string;
  subject: string | null;
  body: string;
  is_active: boolean;
};

export async function fetchNotificationTemplate(
  channel: "email" | "sms" | "whatsapp" | "push",
  key: string,
  language: "en" | "ar" = "ar",
): Promise<NotificationTemplateRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notification_templates")
    .select("id, channel, key, language, subject, body, is_active")
    .eq("channel", channel)
    .eq("key", key)
    .eq("language", language)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as NotificationTemplateRow;
}
