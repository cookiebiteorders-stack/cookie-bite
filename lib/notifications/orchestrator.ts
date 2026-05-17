import { BRAND } from "@/lib/brand";
import { sendTemplateEmail } from "@/lib/email/send";
import { ensurePaidInvoiceForOrder } from "@/lib/invoices/ensure-order-invoice";
import { fetchRawInvoiceForOrder } from "@/lib/invoices/fetch-invoice-for-order";
import { generateInvoicePdfBuffer } from "@/lib/invoices/generate-invoice-pdf";
import { toInvoiceViewModel } from "@/lib/invoices/to-invoice-view-model";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  hasSuccessfulNotification,
  writeNotificationLog,
} from "@/lib/notifications/log";
import {
  appBaseUrl,
  loadOrderNotificationContext,
  orderDisplayNumber,
} from "@/lib/notifications/order-context";
import {
  buildOrderConfirmedWhatsAppBody,
  buildPaymentConfirmedWhatsAppBody,
  orderConfirmedTemplateName,
  paymentConfirmedTemplateName,
  sendWhatsAppTemplate,
} from "@/lib/whatsapp/send";

export type DispatchOptions = {
  /** Bypass idempotency guard (admin resend). */
  force?: boolean;
};

function paymentMethodLabel(method: string): string {
  const m = method.toLowerCase();
  if (m === "cod") return "Cash on delivery";
  if (m === "card") return "Card · Paymob";
  if (m === "wallet") return "Mobile wallet · Paymob";
  return method;
}

function orderConfirmationUrl(base: string, orderNum: string): string {
  return `${base}/order-confirmation?order=${encodeURIComponent(orderNum)}`;
}

function orderTrackUrl(base: string, orderNum: string): string {
  return `${base}/track?order=${encodeURIComponent(orderNum)}`;
}

async function markInvoicePdfGenerated(invoiceId: string) {
  if (!process.env.SUPABASE_SERVICE_KEY) return;
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("invoices")
    .update({ pdf_generated_at: new Date().toISOString() })
    .eq("id", invoiceId);
}

/**
 * Order placed — email + optional WhatsApp (COD and online checkout).
 */
export async function dispatchOrderConfirmed(
  orderId: string,
  options?: DispatchOptions,
): Promise<{ ok: boolean; skipped?: boolean; errors: string[] }> {
  const errors: string[] = [];
  const ctx = await loadOrderNotificationContext(orderId);
  if (!ctx) return { ok: false, errors: ["order_not_found"] };

  const orderNum = orderDisplayNumber(ctx);
  const base = appBaseUrl();
  const confirmUrl = orderConfirmationUrl(base, orderNum);
  const trackUrl = orderTrackUrl(base, orderNum);

  if (ctx.customerEmail) {
    const dup =
      !options?.force &&
      (await hasSuccessfulNotification({
        orderId,
        notificationType: "order_confirmation",
        channel: "email",
        recipient: ctx.customerEmail,
      }));
    if (dup) {
      await writeNotificationLog({
        orderId,
        notificationType: "order_confirmation",
        channel: "email",
        recipient: ctx.customerEmail,
        status: "skipped",
        metadata: { reason: "duplicate" },
      });
    } else if (!process.env.RESEND_API_KEY) {
      errors.push("resend_not_configured");
    } else {
      try {
        const firstName = ctx.customerName.split(/\s+/)[0] ?? "there";
        await sendTemplateEmail({
          to: ctx.customerEmail,
          templateKey: "order-confirmed",
          vars: {
            first_name: firstName,
            order_number: orderNum,
            total_amount: `${ctx.totalEgp.toFixed(2)} EGP`,
            customer_name: ctx.customerName,
            shipping_address: ctx.shippingAddressLine,
            payment_method: paymentMethodLabel(ctx.paymentMethod),
            items_rows: ctx.itemsHtml,
            order_url: confirmUrl,
            company_address: BRAND.location,
            privacy_url: `${base}/privacy`,
            unsubscribe_url: "#",
          },
          lang: ctx.lang,
        });
        await writeNotificationLog({
          orderId,
          notificationType: "order_confirmation",
          channel: "email",
          recipient: ctx.customerEmail,
          status: "sent",
          metadata: { confirm_url: confirmUrl, track_url: trackUrl },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "email_failed";
        errors.push(msg);
        await writeNotificationLog({
          orderId,
          notificationType: "order_confirmation",
          channel: "email",
          recipient: ctx.customerEmail,
          status: "failed",
          errorMessage: msg,
        });
      }
    }
  } else {
    errors.push("no_email");
  }

  if (ctx.customerPhone) {
    const dupWa =
      !options?.force &&
      (await hasSuccessfulNotification({
        orderId,
        notificationType: "order_confirmation",
        channel: "whatsapp",
        recipient: ctx.customerPhone,
      }));
    if (!dupWa) {
      const fallback = buildOrderConfirmedWhatsAppBody({
        customerName: ctx.customerName,
        orderNumber: orderNum,
        totalEgp: ctx.totalEgp,
        trackUrl,
      });
      const wa = await sendWhatsAppTemplate({
        toE164: ctx.customerPhone,
        templateName: orderConfirmedTemplateName(),
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: ctx.customerName.split(/\s+/)[0] ?? "there" },
              { type: "text", text: orderNum },
              { type: "text", text: `${ctx.totalEgp.toFixed(0)} ${BRAND.currency}` },
              { type: "text", text: trackUrl },
            ],
          },
        ],
        fallbackBody: fallback,
      });
      await writeNotificationLog({
        orderId,
        notificationType: "order_confirmation",
        channel: "whatsapp",
        recipient: ctx.customerPhone,
        status: wa.ok ? "sent" : wa.skipped ? "skipped" : "failed",
        errorMessage: wa.error,
        metadata: { mode: wa.mode, skipped: wa.skipped },
      });
      if (!wa.ok && !wa.skipped) errors.push(wa.error ?? "whatsapp_failed");
    }
  }

  return { ok: errors.length === 0, skipped: errors.includes("no_email"), errors };
}

/**
 * Payment captured — invoice row + payment email (PDF) + WhatsApp.
 */
export async function dispatchPaymentConfirmed(
  orderId: string,
  options?: DispatchOptions,
): Promise<{ ok: boolean; invoiceNumber?: string; errors: string[] }> {
  const errors: string[] = [];
  const ctx = await loadOrderNotificationContext(orderId);
  if (!ctx) return { ok: false, errors: ["order_not_found"] };

  const invoice = await ensurePaidInvoiceForOrder(orderId, ctx.totalEgp);
  if (!invoice) {
    errors.push("invoice_failed");
  }

  const orderNum = orderDisplayNumber(ctx);
  const base = appBaseUrl();
  const invoiceUrl = invoice
    ? `${base}/invoices/${encodeURIComponent(invoice.invoiceNumber)}`
    : `${base}/account/orders`;
  const trackUrl = orderTrackUrl(base, orderNum);
  const firstName = ctx.customerName.split(/\s+/)[0] ?? "there";

  let pdfAttachment: { filename: string; content: Buffer } | undefined;
  if (invoice) {
    try {
      const raw = await fetchRawInvoiceForOrder(orderId, invoice);
      if (raw) {
        const vm = toInvoiceViewModel(raw);
        const pdf = await generateInvoicePdfBuffer(vm);
        pdfAttachment = {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdf,
        };
        await markInvoicePdfGenerated(invoice.id);
      }
    } catch (e) {
      console.error("[notifications] invoice PDF", e);
      errors.push("pdf_generation_failed");
    }

    await writeNotificationLog({
      orderId,
      notificationType: "invoice",
      channel: "email",
      recipient: invoice.invoiceNumber,
      status: pdfAttachment ? "sent" : "failed",
      metadata: {
        invoice_id: invoice.id,
        created: invoice.created,
        has_pdf: Boolean(pdfAttachment),
      },
    });
  }

  if (ctx.customerEmail && process.env.RESEND_API_KEY) {
    const dup =
      !options?.force &&
      (await hasSuccessfulNotification({
        orderId,
        notificationType: "payment_confirmation",
        channel: "email",
        recipient: ctx.customerEmail,
      }));
    if (!dup) {
      try {
        await sendTemplateEmail({
          to: ctx.customerEmail,
          templateKey: "payment-confirmed",
          vars: {
            first_name: firstName,
            order_number: orderNum,
            total_amount: `${ctx.totalEgp.toFixed(2)} EGP`,
            payment_method: paymentMethodLabel(ctx.paymentMethod),
            invoice_number: invoice?.invoiceNumber ?? "—",
            invoice_url: invoiceUrl,
            order_url: trackUrl,
            items_rows: ctx.itemsHtml,
            company_address: BRAND.location,
            privacy_url: `${base}/privacy`,
          },
          lang: ctx.lang,
          attachments: pdfAttachment ? [pdfAttachment] : undefined,
        });
        await writeNotificationLog({
          orderId,
          notificationType: "payment_confirmation",
          channel: "email",
          recipient: ctx.customerEmail,
          status: "sent",
          metadata: { invoice_url: invoiceUrl, pdf_attached: Boolean(pdfAttachment) },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "email_failed";
        errors.push(msg);
        await writeNotificationLog({
          orderId,
          notificationType: "payment_confirmation",
          channel: "email",
          recipient: ctx.customerEmail,
          status: "failed",
          errorMessage: msg,
        });
      }
    }
  } else if (!ctx.customerEmail) {
    errors.push("no_email");
  } else if (!process.env.RESEND_API_KEY) {
    errors.push("resend_not_configured");
    console.warn("[notifications] payment_confirmation email skipped — RESEND_API_KEY missing");
  }

  if (ctx.customerPhone) {
    const dupWa =
      !options?.force &&
      (await hasSuccessfulNotification({
        orderId,
        notificationType: "payment_confirmation",
        channel: "whatsapp",
        recipient: ctx.customerPhone,
      }));
    if (!dupWa) {
      const fallback = buildPaymentConfirmedWhatsAppBody({
        customerName: ctx.customerName,
        orderNumber: orderNum,
        totalEgp: ctx.totalEgp,
        invoiceUrl,
      });
      const wa = await sendWhatsAppTemplate({
        toE164: ctx.customerPhone,
        templateName: paymentConfirmedTemplateName(),
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: firstName },
              { type: "text", text: orderNum },
              { type: "text", text: `${ctx.totalEgp.toFixed(0)} ${BRAND.currency}` },
              { type: "text", text: invoiceUrl },
            ],
          },
        ],
        fallbackBody: fallback,
      });
      await writeNotificationLog({
        orderId,
        notificationType: "payment_confirmation",
        channel: "whatsapp",
        recipient: ctx.customerPhone,
        status: wa.ok ? "sent" : wa.skipped ? "skipped" : "failed",
        errorMessage: wa.error,
        metadata: { mode: wa.mode },
      });
    }
  }

  return {
    ok: errors.length === 0,
    invoiceNumber: invoice?.invoiceNumber,
    errors,
  };
}
