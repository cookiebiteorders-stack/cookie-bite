import { EMAIL_CONFIG, getResend } from "@/lib/email/resend";
import { sendAutomatedEmail } from "@/lib/email/automation/pipeline";
import { contactNotification, contactAutoReply } from "@/lib/email/templates";
import { renderTemplate } from "@/lib/notification-library";

const DEFAULT_CUSTOMER_EMAIL_LANG: "en" | "ar" = "ar";

type SendResult = Awaited<ReturnType<ReturnType<typeof getResend>["emails"]["send"]>>;

export type EmailAttachment = {
  filename: string;
  content: Buffer | string;
};

export async function sendInternalEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  emailType?: "transactional" | "notification" | "otp" | "invoice" | "marketing";
  templateKey?: string;
  immediate?: boolean;
}): Promise<SendResult> {
  return dispatch(opts);
}

async function dispatch(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  emailType?: "transactional" | "notification" | "otp" | "invoice" | "marketing";
  templateKey?: string;
  immediate?: boolean;
}): Promise<SendResult> {
  const useAutomation = process.env.EMAIL_AUTOMATION_ENABLED !== "false";
  if (useAutomation) {
    const result = await sendAutomatedEmail({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo ?? EMAIL_CONFIG.replyTo,
      emailType: opts.emailType ?? "transactional",
      templateKey: opts.templateKey,
      immediate: opts.immediate ?? false,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        content:
          typeof a.content === "string" ? a.content : a.content.toString("base64"),
      })),
    });
    if (!result.ok) {
      throw new Error(result.error ?? "Email send failed");
    }
    return { data: { id: result.messageId ?? result.queueId } } as SendResult;
  }

  const resend = getResend();
  return resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: opts.to,
    replyTo: opts.replyTo ?? EMAIL_CONFIG.replyTo,
    subject: opts.subject,
    html: opts.html,
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content:
        typeof a.content === "string" ? a.content : a.content.toString("base64"),
    })),
  });
}

export async function sendWelcomeEmail(opts: {
  to: string;
  name?: string;
  lang?: "en" | "ar";
}) {
  const firstName = opts.name?.split(/\s+/)[0] ?? "there";
  const lang = opts.lang ?? DEFAULT_CUSTOMER_EMAIL_LANG;
  const rendered = renderTemplate(
    "welcome",
    {
      first_name: firstName,
    },
    { lang },
  );
  if (!rendered) throw new Error("Template 'welcome' missing from registry");

  return dispatch({ to: opts.to, subject: rendered.subject, html: rendered.html });
}

export async function sendContactNotification(opts: {
  to: string;
  payload: { name: string; email: string; subject: string; message: string };
}) {
  const tpl = contactNotification(opts.payload);
  return dispatch({
    to: opts.to,
    subject: tpl.subject,
    html: tpl.html,
    // Replies on the team copy go straight back to the customer.
    replyTo: opts.payload.email,
  });
}

/**
 * Polite confirmation sent back to the customer right after they submit the
 * contact form. Keeps them in the loop (and gives them a record of the
 * subject they wrote about).
 */
export async function sendContactAutoReply(opts: {
  to: string;
  name: string;
  subject: string;
}) {
  const tpl = contactAutoReply({ name: opts.name, subject: opts.subject });
  return dispatch({
    to: opts.to,
    subject: tpl.subject,
    html: tpl.html,
  });
}

export async function sendOrderConfirmation(opts: {
  to: string;
  payload: { name: string; orderId: string; total: number; itemsHtml: string };
  lang?: "en" | "ar";
}) {
  const firstName = opts.payload.name?.split(/\s+/)[0] ?? "there";
  const lang = opts.lang ?? DEFAULT_CUSTOMER_EMAIL_LANG;
  const totalLabel =
    lang === "ar"
      ? `${opts.payload.total.toFixed(2)} جنيه`
      : `${opts.payload.total.toFixed(2)} EGP`;
  const rendered = renderTemplate(
    "order-confirmed",
    {
      first_name: firstName,
      order_number: opts.payload.orderId,
      total_amount: totalLabel,
      customer_name: opts.payload.name,
      items_rows: opts.payload.itemsHtml,
    },
    { lang },
  );
  if (!rendered) {
    throw new Error("Template 'order-confirmed' missing from registry");
  }
  return dispatch({ to: opts.to, subject: rendered.subject, html: rendered.html });
}

export async function sendOrderStatusEmail(opts: {
  to: string;
  payload: { orderId: string; status: string; message: string };
}) {
  const rendered = renderTemplate("report-order-status", {
    customer_name: "there",
    report_date: new Date().toLocaleDateString("en-GB"),
    order_rows: `<tr><td>#${escape(opts.payload.orderId)}</td><td>${escape(new Date().toLocaleDateString("en-GB"))}</td><td>—</td><td>—</td><td><span class="badge b">${escape(opts.payload.status)}</span></td></tr>`,
    total_orders: 1,
    total_spent: "—",
    member_since: "—",
  });
  if (!rendered) {
    throw new Error("Template 'report-order-status' missing from registry");
  }
  const subject = `Order update — #${opts.payload.orderId}`;
  const html = rendered.html.replace(
    /(<\/table>)/,
    `$1<div class="info-box"><p>${escape(opts.payload.message)}</p></div>`,
  );
  return dispatch({ to: opts.to, subject, html });
}

/**
 * Generic dispatcher for any template in `lib/notification-library`.
 *
 * Use this whenever a new flow wants to send a notification — pass the
 * template key + per-recipient variables and we'll handle rendering + Resend.
 */
export async function sendTemplateEmail(opts: {
  to: string;
  templateKey: string;
  vars?: Record<string, string | number>;
  lang?: "en" | "ar";
  replyTo?: string;
  subjectOverride?: string;
  attachments?: EmailAttachment[];
  immediate?: boolean;
}) {
  const rendered = renderTemplate(opts.templateKey, opts.vars ?? {}, {
    lang: opts.lang,
  });
  if (!rendered) {
    throw new Error(`Template "${opts.templateKey}" not found in registry`);
  }
  return dispatch({
    to: opts.to,
    subject: opts.subjectOverride ?? rendered.subject,
    html: rendered.html,
    replyTo: opts.replyTo,
    attachments: opts.attachments,
    templateKey: opts.templateKey,
    emailType: "notification",
    immediate: opts.immediate,
  });
}

function escape(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
