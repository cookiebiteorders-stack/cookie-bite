import { BRAND } from "@/lib/brand";
import { postWhatsAppBridge } from "@/lib/whatsapp/bridge-client";
import { normalizeEgyptPhone } from "@/lib/whatsapp/phone";

type WhatsAppTextPayload = {
  toE164: string;
  body: string;
};

export type WhatsAppTemplateComponent = {
  type: "body";
  parameters: Array<{ type: "text"; text: string }>;
};

export type WhatsAppSendResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  mode?: "template" | "text" | "bridge";
};

function whatsAppConfig() {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "ar";
  return { token, phoneNumberId, language };
}

async function postWhatsAppMessage(body: Record<string, unknown>) {
  const { token, phoneNumberId } = whatsAppConfig();
  if (!token || !phoneNumberId) {
    return { ok: false as const, skipped: true, error: "WhatsApp not configured" };
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false as const, error: text || `HTTP ${res.status}` };
  }
  return { ok: true as const };
}

/**
 * Meta-approved template message (falls back to free text if template name unset).
 */
export async function sendWhatsAppTemplate(opts: {
  toE164: string;
  templateName: string | undefined;
  components?: WhatsAppTemplateComponent[];
  fallbackBody: string;
}): Promise<WhatsAppSendResult> {
  const { token, phoneNumberId, language } = whatsAppConfig();
  const to = normalizeEgyptPhone(opts.toE164);
  if (!to) {
    return { ok: false, error: "Invalid phone number" };
  }

  if (token && phoneNumberId) {
    if (opts.templateName) {
      const result = await postWhatsAppMessage({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: opts.templateName,
          language: { code: language },
          components: opts.components ?? [],
        },
      });
      if (result.ok) return { ok: true, mode: "template" };
      console.warn("[whatsapp] template failed, falling back to text", result.error);
    }

    const textResult = await postWhatsAppMessage({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: opts.fallbackBody },
    });
    if (textResult.ok) return { ok: true, mode: "text" };
  }

  const bridge = await postWhatsAppBridge("/send/raw", {
    phone: to,
    message: opts.fallbackBody,
  });
  if (bridge.ok) return { ok: true, mode: "bridge" };
  if (bridge.skipped) {
    return { ok: false, skipped: true, error: "WhatsApp not configured", mode: "bridge" };
  }
  return { ok: false, error: bridge.error ?? "WhatsApp send failed", mode: bridge.mode };
}

/** @deprecated Use sendWhatsAppTemplate */
export async function sendWhatsAppText(
  payload: WhatsAppTextPayload,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  return sendWhatsAppTemplate({
    toE164: payload.toE164,
    templateName: undefined,
    fallbackBody: payload.body,
  });
}

export function buildOrderConfirmedWhatsAppBody(opts: {
  customerName: string;
  orderNumber: string;
  totalEgp: number;
  trackUrl: string;
}): string {
  const first = opts.customerName.split(/\s+/)[0] ?? "there";
  return (
    `مرحباً ${first}! 🍪\n` +
    `تم تأكيد طلبك #${opts.orderNumber} من Cookie Bite.\n` +
    `الإجمالي: ${opts.totalEgp.toFixed(0)} ${BRAND.currency}.\n` +
    `تتبّع الطلب: ${opts.trackUrl}\n` +
    `للاستفسار: واتساب ${BRAND.phoneDisplay}`
  );
}

export function buildPaymentConfirmedWhatsAppBody(opts: {
  customerName: string;
  orderNumber: string;
  totalEgp: number;
  invoiceUrl: string;
}): string {
  const first = opts.customerName.split(/\s+/)[0] ?? "there";
  return (
    `شكراً ${first}! ✅\n` +
    `تم استلام دفعتك لطلب #${opts.orderNumber} (${opts.totalEgp.toFixed(0)} ${BRAND.currency}).\n` +
    `فاتورتك: ${opts.invoiceUrl}\n` +
    `— Cookie Bite`
  );
}

export function orderConfirmedTemplateName(): string | undefined {
  return process.env.WHATSAPP_TEMPLATE_ORDER_CONFIRMED?.trim() || undefined;
}

export function paymentConfirmedTemplateName(): string | undefined {
  return process.env.WHATSAPP_TEMPLATE_PAYMENT_CONFIRMED?.trim() || undefined;
}
