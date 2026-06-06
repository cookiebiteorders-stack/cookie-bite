import { BRAND } from "@/lib/brand";
import { sendInternalEmail } from "@/lib/email/send";
import { renderTemplate } from "@/lib/notification-library";
import { firstNameFromEmail } from "@/lib/notification-library/resolve-recipient-vars";
import { appBaseUrl } from "@/lib/notifications/order-context";

const DEFAULT_LANG: "en" | "ar" = "ar";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstNameFromFullName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function formatActionDate(lang: "en" | "ar"): string {
  return new Date().toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  });
}

function buildModerationVars(input: {
  email: string;
  fullName?: string | null;
  reason?: string | null;
  lang: "en" | "ar";
}) {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName?.trim() ?? "";
  const firstName = fullName
    ? firstNameFromFullName(fullName)
    : firstNameFromEmail(email);
  const customerName = fullName || firstName;
  const reasonRaw = input.reason?.trim();
  const action_reason = reasonRaw
    ? escapeHtml(reasonRaw)
    : input.lang === "ar"
      ? "لم يُذكر"
      : "Not specified";

  const base = appBaseUrl();
  return {
    first_name: firstName,
    customer_name: customerName,
    email_address: email,
    email,
    action_date: formatActionDate(input.lang),
    action_reason,
    shop_url: `${base}/shop`,
    help_url: `${base}/help`,
    contact_url: `${base}/contact`,
    privacy_url: `${base}/privacy`,
    company_address: BRAND.location,
  };
}

async function sendModerationTemplate(
  templateKey: "account-deleted" | "account-blocked",
  input: {
    email: string;
    fullName?: string | null;
    reason?: string | null;
    lang?: "en" | "ar";
  },
): Promise<void> {
  const lang = input.lang ?? DEFAULT_LANG;
  const vars = buildModerationVars({ ...input, lang });
  const rendered = renderTemplate(templateKey, vars, { lang });
  if (!rendered) {
    throw new Error(`Template "${templateKey}" not found`);
  }

  await sendInternalEmail({
    to: vars.email_address,
    subject: rendered.subject,
    html: rendered.html,
    templateKey,
    emailType: "transactional",
    immediate: true,
  });
}

/** Notify customer their profile was removed (email not blocked). */
export async function sendAccountDeletedNotification(input: {
  email: string;
  fullName?: string | null;
  lang?: "en" | "ar";
}): Promise<void> {
  await sendModerationTemplate("account-deleted", input);
}

/** Notify customer their account was blocked and removed. */
export async function sendAccountBlockedNotification(input: {
  email: string;
  fullName?: string | null;
  reason?: string | null;
  lang?: "en" | "ar";
}): Promise<void> {
  await sendModerationTemplate("account-blocked", input);
}
