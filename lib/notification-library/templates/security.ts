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

const PASSWORD_RESET_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag warning">Security</span>
    <h1>Reset your password</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>We received a request to reset the password for your account associated with <strong>{{email_address}}</strong>.</p>
    <p>Click the button below to set a new password. This link expires in <strong>{{expiry_time}}</strong>.</p>
    <div style="text-align:center;margin:24px 0;"><a class="cta-btn" href="{{reset_url}}">Reset My Password</a></div>
    <div class="info-box"><p>⚠️ <strong>Didn't request this?</strong> You can safely ignore this email. Your password will not change.</p></div>
    <hr class="divider">
    <p style="font-size:13px;color:#888;">For security reasons, this link can only be used once and expires in {{expiry_time}}.</p>
  </div>
  <div class="email-footer"><p>© 2025 [Your Store]. All rights reserved.<br>{{company_address}}<br><a href="{{privacy_url}}">Privacy Policy</a></p></div>
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
      company_address: "Cookie Bite Bakery, Cairo, Egypt",
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

const EMAIL_VERIFICATION_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag blue">Account Setup</span>
    <h1>Verify your email address</h1>
    <p>Hi {{first_name}},</p>
    <p>Thanks for registering. Please verify your email to activate your account and start shopping.</p>
    <div class="otp-box">
      <div class="otp">{{verification_code}}</div>
      <p>Enter this code on the verification page. Expires in {{expiry_time}}.</p>
    </div>
    <div style="text-align:center;"><a class="cta" href="{{verify_url}}">Verify My Email</a></div>
    <div class="ibox"><p>Didn't create an account? You can safely ignore this email — no action is needed.</p></div>
  </div>
  <div class="ef"><p>© 2025 [Your Store] · <a href="{{privacy_url}}">Privacy Policy</a></p></div>
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
      subject: "Verify your email address",
      preheader: `Your code: ${merged.verification_code}`,
      html: buildEmail(EMAIL_VERIFICATION_BODY, merged, {
        title: "Verify your email",
        preheader: `Your code: ${merged.verification_code}`,
        lang: options?.lang,
      }),
    };
  },
};

const TWO_FA_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag blue">Login Verification</span>
    <h1>Your one-time login code</h1>
    <p>Hi {{first_name}},</p>
    <p>Use the code below to complete your sign-in. This code is valid for <strong>{{expiry_minutes}} minutes</strong> and can only be used once.</p>
    <div class="otp-box">
      <div class="otp">{{otp_code}}</div>
      <p>Do not share this code with anyone.</p>
    </div>
    <div class="ibox">
      <p>Signing in from: <strong>{{device_info}}</strong> · {{login_location}}<br>
      If this wasn't you, <a href="{{reset_url}}" style="color:#1a1a2e;">reset your password immediately</a>.</p>
    </div>
  </div>
  <div class="ef"><p>© 2025 [Your Store] · This is an automated security email. <a href="{{help_url}}">Help</a></p></div>
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
      reset_url: "https://cookie-bite.com/reset",
      help_url: "https://cookie-bite.com/help",
    },
  },
  build(vars, options) {
    const merged = { ...twoFaTemplate.meta.sampleVars, ...vars };
    return {
      key: twoFaTemplate.meta.key,
      subject: `Your login code: ${merged.otp_code}`,
      preheader: `Expires in ${merged.expiry_minutes} minutes.`,
      html: buildEmail(TWO_FA_BODY, merged, {
        title: "Login verification",
        preheader: `Expires in ${merged.expiry_minutes} minutes.`,
        lang: options?.lang,
      }),
    };
  },
};

const SECURITY_ALERT_BODY = `
<div class="ew">
  <div class="eh" style="background:#7d1a1a;"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag red">Security Notice</span>
    <h1>Your account was updated</h1>
    <p>Hi {{first_name}},</p>
    <p>We noticed a change to your account on <strong>{{change_date}}</strong> at <strong>{{change_time}}</strong> from <strong>{{device_info}}</strong>.</p>
    <table class="tbl">
      <thead><tr><th>Change</th><th>Details</th></tr></thead>
      <tbody>
        <tr><td>{{change_type}}</td><td>{{change_detail}}</td></tr>
        <tr><td>IP Address</td><td>{{ip_address}}</td></tr>
        <tr><td>Location</td><td>{{location}}</td></tr>
      </tbody>
    </table>
    <div class="ibox" style="border-left-color:#c62828;background:#fce4ec;">
      <p style="color:#7d1a1a;"><strong>Not you?</strong> Secure your account immediately by resetting your password.</p>
    </div>
    <div style="text-align:center;"><a class="cta" style="background:#7d1a1a;" href="{{secure_url}}">Secure My Account</a></div>
  </div>
  <div class="ef"><p>© 2025 [Your Store] · <a href="{{help_url}}">Help Center</a> · <a href="{{privacy_url}}">Privacy Policy</a></p></div>
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
      secure_url: "https://cookie-bite.com/reset",
      help_url: "https://cookie-bite.com/help",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...securityAlertTemplate.meta.sampleVars, ...vars };
    return {
      key: securityAlertTemplate.meta.key,
      subject: "Security alert · Your account was updated",
      preheader: `${merged.change_type} from ${merged.device_info}`,
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
