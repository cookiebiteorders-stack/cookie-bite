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

const DEFAULT_BRAND_MAILBOX = "cookie-bite@cookie-bite.com";

function extractEmailAddress(raw: string): string {
  const trimmed = raw.trim();
  const angle = trimmed.match(/<([^>]+)>/);
  return (angle?.[1] ?? trimmed).trim().toLowerCase();
}

/** صندوق العلامة — يُستخدم للإرسال والرد والتنبيهات الداخلية. */
export function resolveBrandMailbox(): string {
  const fromEnv = process.env.RESEND_FROM_EMAIL?.trim();
  if (fromEnv) {
    return extractEmailAddress(fromEnv);
  }
  return (
    process.env.RESEND_REPLY_TO?.trim().toLowerCase() ||
    process.env.STORE_OPS_EMAIL?.trim().toLowerCase() ||
    process.env.CONTACT_INBOX?.trim().toLowerCase() ||
    DEFAULT_BRAND_MAILBOX
  );
}

function resolveFromHeader(): string {
  const raw = process.env.RESEND_FROM_EMAIL?.trim();
  if (raw && raw.includes("<")) return raw;
  const mailbox = resolveBrandMailbox();
  return `Cookie Bite <${mailbox}>`;
}

/** Ignore legacy Gmail reply-to — customer replies should hit the brand mailbox. */
function resolveReplyTo(): string {
  const brand = resolveBrandMailbox();
  const raw = process.env.RESEND_REPLY_TO?.trim();
  if (!raw) return brand;
  const addr = extractEmailAddress(raw);
  if (addr.endsWith("@gmail.com") || addr.endsWith("@googlemail.com")) {
    return brand;
  }
  return raw;
}

export const EMAIL_CONFIG = {
  from: resolveFromHeader(),
  replyTo: resolveReplyTo(),
  /** Inbox for internal notifications (orders, contact, alerts). */
  inbox:
    process.env.STORE_OPS_EMAIL?.trim().toLowerCase() ||
    process.env.CONTACT_INBOX?.trim().toLowerCase() ||
    resolveBrandMailbox(),
  domain: process.env.RESEND_DOMAIN ?? "cookie-bite.com",
  brandMailbox: resolveBrandMailbox(),
} as const;

/** True once a Resend key is configured in the environment. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
