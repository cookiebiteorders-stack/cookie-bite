import { applyVars, renderShell } from "../shell";
import type { TemplateBuilder } from "../types";

function buildEmail(
  body: string,
  vars: Record<string, string | number | undefined | null>,
  opts: { title: string; preheader?: string; lang?: "en" | "ar" },
): string {
  return renderShell(applyVars(body, vars), {
    title: opts.title,
    preheader: opts.preheader,
    variant: "email",
    lang: opts.lang,
  });
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

export const SECURITY_TEMPLATES: TemplateBuilder[] = [
  passwordResetTemplate,
  emailVerificationTemplate,
  twoFaTemplate,
  securityAlertTemplate,
];
