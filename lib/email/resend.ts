import { Resend } from "resend";

/* -------------------------------------------------------------------------- *
 * Resend client (lazy singleton)                                              *
 * -------------------------------------------------------------------------- */

let _resend: Resend | null = null;

export function getResend() {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY");
  _resend = new Resend(key);
  return _resend;
}

/* -------------------------------------------------------------------------- *
 * Brand-aligned defaults                                                      *
 *                                                                             *
 *  - `from`       — From: header. ALWAYS use the brand mailbox so DMARC/DKIM  *
 *                   pass and customers see "Cookie Bite" instead of an alias. *
 *  - `replyTo`    — Replies route back to the same brand inbox by default so  *
 *                   responses arrive in Hostinger Webmail.                    *
 *  - `inbox`      — The address used as "to" when the website sends           *
 *                   internal notifications (contact form, order alerts, …).   *
 *  - `domain`     — The verified Resend domain. Used for SPF/DKIM diagnostics.*
 * -------------------------------------------------------------------------- */

const BRAND_MAILBOX = "cookie-bite@cookie-bite.com";

export const EMAIL_CONFIG = {
  from: process.env.RESEND_FROM_EMAIL ?? `Cookie Bite <${BRAND_MAILBOX}>`,
  replyTo: process.env.RESEND_REPLY_TO ?? BRAND_MAILBOX,
  /** Inbox that receives internal notifications (contact form, alerts, …). */
  inbox: process.env.CONTACT_INBOX ?? BRAND_MAILBOX,
  domain: process.env.RESEND_DOMAIN ?? "cookie-bite.com",
  brandMailbox: BRAND_MAILBOX,
} as const;

/** True once a Resend key is configured in the environment. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
