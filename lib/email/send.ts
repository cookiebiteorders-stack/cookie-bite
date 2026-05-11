import { EMAIL_CONFIG, getResend } from "@/lib/email/resend";
import {
  contactNotification,
  orderConfirmationEmail,
  welcomeEmail,
} from "@/lib/email/templates";

export async function sendWelcomeEmail(opts: {
  to: string;
  name?: string;
  credentials?: { username: string; password: string };
}) {
  const resend = getResend();
  const tpl = welcomeEmail({ name: opts.name, credentials: opts.credentials });
  return resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: opts.to,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: tpl.subject,
    html: tpl.html,
  });
}

export async function sendContactNotification(opts: {
  to: string;
  payload: { name: string; email: string; subject: string; message: string };
}) {
  const resend = getResend();
  const tpl = contactNotification(opts.payload);
  return resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: opts.to,
    replyTo: opts.payload.email,
    subject: tpl.subject,
    html: tpl.html,
  });
}

export async function sendOrderConfirmation(opts: {
  to: string;
  payload: { name: string; orderId: string; total: number; itemsHtml: string };
}) {
  const resend = getResend();
  const tpl = orderConfirmationEmail(opts.payload);
  return resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: opts.to,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: tpl.subject,
    html: tpl.html,
  });
}

export async function sendOrderStatusEmail(opts: {
  to: string;
  payload: { orderId: string; status: string; message: string };
}) {
  const resend = getResend();
  const subject = `Order update — #${opts.payload.orderId}`;
  const html = `<!doctype html><html><body style="font-family:DM Sans,system-ui,sans-serif;background:#FBF3EA;padding:24px;color:#3C2A21">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #F2DDC5;border-radius:16px;padding:24px">
  <h2 style="margin:0 0 12px;color:#B25336">Order update</h2>
  <p style="margin:0 0 8px"><strong>Order:</strong> #${opts.payload.orderId}</p>
  <p style="margin:0 0 8px"><strong>Status:</strong> ${opts.payload.status}</p>
  <p style="margin:16px 0 0">${opts.payload.message}</p>
  </div></body></html>`;
  return resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: opts.to,
    replyTo: EMAIL_CONFIG.replyTo,
    subject,
    html,
  });
}
