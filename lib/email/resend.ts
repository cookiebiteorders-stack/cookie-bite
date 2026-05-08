import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend() {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY");
  _resend = new Resend(key);
  return _resend;
}

export const EMAIL_CONFIG = {
  from: process.env.RESEND_FROM_EMAIL ?? "Cookie Bite <onboarding@resend.dev>",
  replyTo: process.env.RESEND_REPLY_TO,
} as const;
