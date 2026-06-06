import { applyVars, renderShell } from "../shell";
import { pickArEmail } from "./bodies-ar";
import type { TemplateBuilder } from "../types";

type EmailVars = Record<string, string | number | undefined | null>;

function buildEmail(
  body: string,
  vars: EmailVars,
  opts: { title: string; preheader?: string; lang?: "en" | "ar" },
): string {
  return renderShell(applyVars(body, vars), {
    title: opts.title,
    preheader: opts.preheader,
    variant: "email",
    lang: opts.lang,
  });
}

function resolveCopy(
  key: string,
  lang: "en" | "ar" | undefined,
  en: { body: string; subject: string; preheader: string; title: string },
  merged: EmailVars,
) {
  const ar = lang === "ar" ? pickArEmail(key) : undefined;
  if (!ar) return en;
  return {
    body: ar.body,
    subject: ar.subject(merged),
    preheader: ar.preheader(merged),
    title: ar.title,
  };
}

/* ─────────────────────────── Password reset ─────────────────────────── */

const PASSWORD_RESET_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag warning">Account security</span>
    <h1>Reset your password.</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>We received a request to reset the password on the account linked to <strong>{{email_address}}</strong>. Use the button below to set a new one — the link is good for <strong>{{expiry_time}}</strong>.</p>
    <div style="text-align:center;margin:20px 0;"><a class="cta-btn" href="{{reset_url}}">Reset my password</a></div>
    <div class="info-box"><p>⚠️ <strong>Didn't request this?</strong> No action needed — your password stays exactly as it is. If this keeps happening, please <a href="{{help_url}}">let us know</a>.</p></div>
    <hr class="divider">
    <p style="font-size:13px;color:#9C8B7A;">For your security, the link can only be used once and expires in {{expiry_time}}.</p>
  </div>
  <div class="email-footer"><p>© 2026 [Your Store] · Hand-baked in {{company_address}}<br><a href="{{help_url}}">Help</a> · <a href="{{privacy_url}}">Privacy</a></p></div>
</div>
`;

export const passwordResetTemplate: TemplateBuilder = {
  meta: {
    key: "password-reset",
    name: "Password Reset",
    description: "Sent when a user requests to reset their password.",
    category: "security",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      email_address: "sara@example.com",
      expiry_time: "30 minutes",
      reset_url: "https://cookie-bite.com/reset?token=demo",
      company_address: "Fifth Settlement, New Cairo, Egypt",
      help_url: "https://cookie-bite.com/help",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...passwordResetTemplate.meta.sampleVars, ...vars };
    return {
      key: passwordResetTemplate.meta.key,
      subject: "Reset your Cookie Bite password",
      preheader: `Link expires in ${merged.expiry_time}.`,
      html: buildEmail(PASSWORD_RESET_BODY, merged, {
        title: "Reset password",
        preheader: `Link expires in ${merged.expiry_time}.`,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── Email verification ─────────────────────────── */

const EMAIL_VERIFICATION_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag blue">Verify your email</span>
    <h1>Almost in, {{first_name}} — let's confirm it's you.</h1>
    <p>Welcome to Cookie Bite! Pop the code below into the verification page to activate your account.</p>
    <div class="otp-box">
      <div class="otp">{{verification_code}}</div>
      <p>Code expires in {{expiry_time}}</p>
    </div>
    <div style="text-align:center;margin-top:18px;"><a class="cta" href="{{verify_url}}">Verify my email</a></div>
    <div class="ibox"><p>Didn't sign up? You can safely ignore this — no account will be created.</p></div>
  </div>
  <div class="ef"><p>© 2026 [Your Store] · <a href="{{privacy_url}}">Privacy</a></p></div>
</div>
`;

export const emailVerificationTemplate: TemplateBuilder = {
  meta: {
    key: "email-verification",
    name: "Email Verification",
    description: "Sends a verification code to confirm a new email address.",
    category: "security",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      verification_code: "482915",
      expiry_time: "15 minutes",
      verify_url: "https://cookie-bite.com/verify",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...emailVerificationTemplate.meta.sampleVars, ...vars };
    return {
      key: emailVerificationTemplate.meta.key,
      subject: `Your Cookie Bite verification code: ${merged.verification_code}`,
      preheader: `Code: ${merged.verification_code} · expires in ${merged.expiry_time}`,
      html: buildEmail(EMAIL_VERIFICATION_BODY, merged, {
        title: "Verify your email",
        preheader: `Your code: ${merged.verification_code}`,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── 2FA login code ─────────────────────────── */

const TWO_FA_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag blue">Sign-in verification</span>
    <h1>Your one-time login code.</h1>
    <p>Hi {{first_name}}, use the code below to finish signing in. It's valid for <strong>{{expiry_minutes}} minutes</strong> and can only be used once.</p>
    <div class="otp-box">
      <div class="otp">{{otp_code}}</div>
      <p>Never share this code with anyone — including us.</p>
    </div>
    <div class="ibox">
      <p>Signing in from <strong>{{device_info}}</strong> · {{login_location}}<br>
      Wasn't you? <a href="{{reset_url}}">Reset your password right away</a>.</p>
    </div>
  </div>
  <div class="ef"><p>© 2026 [Your Store] · This is an automated security email. <a href="{{help_url}}">Help</a></p></div>
</div>
`;

export const twoFaTemplate: TemplateBuilder = {
  meta: {
    key: "two-factor-code",
    name: "2FA Login Code",
    description: "Delivers a one-time code to complete sign-in.",
    category: "security",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      otp_code: "739204",
      expiry_minutes: 10,
      device_info: "Chrome on Windows",
      login_location: "Cairo, EG",
      reset_url: "https://cookie-bite.com/sign-in",
      help_url: "https://cookie-bite.com/help",
    },
  },
  build(vars, options) {
    const merged = { ...twoFaTemplate.meta.sampleVars, ...vars };
    return {
      key: twoFaTemplate.meta.key,
      subject: `Your Cookie Bite login code: ${merged.otp_code}`,
      preheader: `Expires in ${merged.expiry_minutes} minutes.`,
      html: buildEmail(TWO_FA_BODY, merged, {
        title: "Login verification",
        preheader: `Expires in ${merged.expiry_minutes} minutes.`,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── Security alert ─────────────────────────── */

const SECURITY_ALERT_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag red">Security notice</span>
    <h1>We noticed a change to your account.</h1>
    <p>Hi {{first_name}}, this is a quick heads-up that something on your account changed on <strong>{{change_date}}</strong> at <strong>{{change_time}}</strong> from <strong>{{device_info}}</strong>.</p>
    <table class="tbl">
      <thead><tr><th>What changed</th><th>Detail</th></tr></thead>
      <tbody>
        <tr><td>{{change_type}}</td><td>{{change_detail}}</td></tr>
        <tr><td>IP address</td><td>{{ip_address}}</td></tr>
        <tr><td>Location</td><td>{{location}}</td></tr>
      </tbody>
    </table>
    <div class="ibox" style="border-left-color:#DC2626;background:#FEE2E2;">
      <p style="color:#7F1D1D;"><strong>Wasn't you?</strong> Lock down your account by resetting your password right away.</p>
    </div>
    <div style="text-align:center;margin-top:18px;"><a class="cta" style="background:#DC2626;" href="{{secure_url}}">Secure my account</a></div>
  </div>
  <div class="ef"><p>© 2026 [Your Store] · <a href="{{help_url}}">Help</a> · <a href="{{privacy_url}}">Privacy</a></p></div>
</div>
`;

export const securityAlertTemplate: TemplateBuilder = {
  meta: {
    key: "security-alert",
    name: "Security Alert",
    description: "Notifies the user about a sensitive change to their account.",
    category: "security",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      change_date: "16 May 2026",
      change_time: "5:42 AM UTC+3",
      device_info: "Chrome on Windows",
      change_type: "Password changed",
      change_detail: "New password set",
      ip_address: "156.197.12.4",
      location: "Cairo, EG",
      secure_url: "https://cookie-bite.com/sign-in",
      help_url: "https://cookie-bite.com/help",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...securityAlertTemplate.meta.sampleVars, ...vars };
    return {
      key: securityAlertTemplate.meta.key,
      subject: "Security alert · Your Cookie Bite account was updated",
      preheader: `${merged.change_type} from ${merged.device_info} · ${merged.location}`,
      html: buildEmail(SECURITY_ALERT_BODY, merged, {
        title: "Security alert",
        preheader: `${merged.change_type} from ${merged.device_info}`,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── Account deleted ─────────────────────────── */

const ACCOUNT_DELETED_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag warning">Account update</span>
    <h1>Your account has been removed.</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>We're writing to confirm that the Cookie Bite account linked to <strong>{{email_address}}</strong> was permanently removed on <strong>{{action_date}}</strong>.</p>
    <div class="info-box"><p>Your order history and saved preferences are no longer available in our system. You may create a new account anytime using the same email address.</p></div>
    <p style="font-size:13px;color:#9C8B7A;">If you didn't request this or believe it was a mistake, please <a href="{{contact_url}}">contact our team</a> — we're happy to help.</p>
    <div style="text-align:center;margin:22px 0;"><a class="cta-btn" href="{{shop_url}}">Visit Cookie Bite</a></div>
    <hr class="divider">
    <p style="font-size:13px;color:#9C8B7A;">Questions? Visit our <a href="{{help_url}}">Help Center</a> or reply to this email.</p>
  </div>
  <div class="email-footer"><p>© 2026 [Your Store] · Hand-baked in {{company_address}}<br><a href="{{help_url}}">Help</a> · <a href="{{privacy_url}}">Privacy</a></p></div>
</div>
`;

export const accountDeletedTemplate: TemplateBuilder = {
  meta: {
    key: "account-deleted",
    name: "Account Deleted",
    description: "Sent when an admin removes a customer account (without blocking the email).",
    category: "security",
    variant: "email",
    sampleVars: {
      first_name: "{{first_name}}",
      customer_name: "{{customer_name}}",
      email_address: "{{email}}",
      action_date: "{{action_date}}",
      shop_url: "https://cookie-bite.com/shop",
      help_url: "https://cookie-bite.com/help",
      contact_url: "https://cookie-bite.com/contact",
      privacy_url: "https://cookie-bite.com/privacy",
      company_address: "Fifth Settlement, New Cairo, Egypt",
    },
  },
  build(vars, options) {
    const merged = { ...accountDeletedTemplate.meta.sampleVars, ...vars };
    const copy = resolveCopy(
      "account-deleted",
      options?.lang,
      {
        body: ACCOUNT_DELETED_BODY,
        subject: "Your Cookie Bite account has been removed",
        preheader: `Account for ${merged.email_address} was removed on ${merged.action_date}.`,
        title: "Account removed",
      },
      merged,
    );
    return {
      key: accountDeletedTemplate.meta.key,
      subject: copy.subject,
      preheader: copy.preheader,
      html: buildEmail(copy.body, merged, {
        title: copy.title,
        preheader: copy.preheader,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── Account blocked ─────────────────────────── */

const ACCOUNT_BLOCKED_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag red">Account suspended</span>
    <h1>Your account access has been blocked.</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>The Cookie Bite account linked to <strong>{{email_address}}</strong> was suspended on <strong>{{action_date}}</strong>. This email address can no longer be used to sign up or sign in.</p>
    <table class="tbl">
      <thead><tr><th>Detail</th><th>Info</th></tr></thead>
      <tbody>
        <tr><td>Email</td><td>{{email_address}}</td></tr>
        <tr><td>Date</td><td>{{action_date}}</td></tr>
        <tr><td>Reason</td><td>{{action_reason}}</td></tr>
      </tbody>
    </table>
    <div class="info-box" style="border-left-color:#DC2626;background:#FEE2E2;">
      <p style="color:#7F1D1D;"><strong>What this means:</strong> Your profile was removed and future registration with this email is blocked.</p>
    </div>
    <p style="font-size:13px;color:#9C8B7A;">If you believe this was an error, <a href="{{contact_url}}">contact us</a> with your registered email and we'll review your case.</p>
    <hr class="divider">
    <p style="font-size:13px;color:#9C8B7A;"><a href="{{help_url}}">Help Center</a> · <a href="{{privacy_url}}">Privacy policy</a></p>
  </div>
  <div class="email-footer"><p>© 2026 [Your Store] · Hand-baked in {{company_address}}<br><a href="{{help_url}}">Help</a> · <a href="{{privacy_url}}">Privacy</a></p></div>
</div>
`;

export const accountBlockedTemplate: TemplateBuilder = {
  meta: {
    key: "account-blocked",
    name: "Account Blocked",
    description: "Sent when an admin blocks a customer email and removes their account.",
    category: "security",
    variant: "email",
    sampleVars: {
      first_name: "{{first_name}}",
      customer_name: "{{customer_name}}",
      email_address: "{{email}}",
      action_date: "{{action_date}}",
      action_reason: "{{action_reason}}",
      shop_url: "https://cookie-bite.com/shop",
      help_url: "https://cookie-bite.com/help",
      contact_url: "https://cookie-bite.com/contact",
      privacy_url: "https://cookie-bite.com/privacy",
      company_address: "Fifth Settlement, New Cairo, Egypt",
    },
  },
  build(vars, options) {
    const merged = { ...accountBlockedTemplate.meta.sampleVars, ...vars };
    const copy = resolveCopy(
      "account-blocked",
      options?.lang,
      {
        body: ACCOUNT_BLOCKED_BODY,
        subject: "Your Cookie Bite account has been suspended",
        preheader: `Access blocked for ${merged.email_address} on ${merged.action_date}.`,
        title: "Account suspended",
      },
      merged,
    );
    return {
      key: accountBlockedTemplate.meta.key,
      subject: copy.subject,
      preheader: copy.preheader,
      html: buildEmail(copy.body, merged, {
        title: copy.title,
        preheader: copy.preheader,
        lang: options?.lang,
      }),
    };
  },
};

export const SECURITY_TEMPLATES: TemplateBuilder[] = [
  passwordResetTemplate,
  emailVerificationTemplate,
  twoFaTemplate,
  securityAlertTemplate,
  accountDeletedTemplate,
  accountBlockedTemplate,
];
