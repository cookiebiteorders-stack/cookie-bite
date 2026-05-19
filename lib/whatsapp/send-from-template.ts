import { fetchNotificationTemplate } from "@/lib/notifications/fetch-notification-template";
import { renderTemplateString } from "@/lib/notifications/template-vars";
import { postWhatsAppBridge } from "@/lib/whatsapp/bridge-client";
import type { WhatsAppSendResult } from "@/lib/whatsapp/send";

/**
 * Send WhatsApp using admin-edited body from `notification_templates`.
 * Falls back to caller when no active template exists.
 */
export async function sendWhatsAppFromDbTemplate(opts: {
  key: string;
  phone: string;
  language?: "en" | "ar";
  vars: Record<string, string | number | undefined | null>;
}): Promise<WhatsAppSendResult & { usedTemplate: boolean }> {
  const language = opts.language ?? "ar";
  const row = await fetchNotificationTemplate("whatsapp", opts.key, language);
  if (!row?.body?.trim()) {
    return { ok: false, skipped: true, error: "no_db_template", usedTemplate: false, mode: "bridge" };
  }

  const message = renderTemplateString(row.body, opts.vars);
  const result = await postWhatsAppBridge("/send/raw", {
    phone: opts.phone,
    message,
  });
  return { ...result, usedTemplate: result.ok };
}
