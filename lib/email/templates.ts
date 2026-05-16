/**
 * Small HTML email templates rendered without React Email. These are used for
 * *internal* notifications (e.g. the brand-inbox copy of a contact form
 * submission, customer auto-replies) where we want a leaner layout than the
 * full notification-library shell.
 *
 * For customer-facing emails (welcome, order confirmation, password reset,
 * etc.) please use `lib/notification-library` instead — those carry the full
 * branded header, footer, and CSS.
 */

const FONT_STACK =
  "'Inter','DM Sans','Helvetica Neue','Segoe UI',Arial,system-ui,sans-serif";
const SERIF_STACK = "'Playfair Display','Cormorant Garamond',Georgia,serif";

const BRAND = {
  ink: "#3D2814",
  inkSoft: "#5C3A21",
  paper: "#FBF3EA",
  cream2: "#F4EADA",
  surface: "#FFFFFF",
  border: "#EDE3D2",
  borderSoft: "#F2DDC5",
  accent: "#C1692C",
  accentDark: "#B45309",
  accentTint: "#FDE8D8",
  muted: "#9C8B7A",
};

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://cookie-bite.com"
);
const LOGO_URL =
  process.env.NEXT_PUBLIC_EMAIL_LOGO_URL || `${APP_URL}/brand/logo-mark.svg`;
const BRAND_NAME = "Cookie Bite";
const TAGLINE = "Small-batch cookies · New Cairo";

function shell(inner: string, opts: { title: string; preheader?: string } = { title: BRAND_NAME }) {
  const preheader = opts.preheader
    ? `<div style="display:none;font-size:1px;color:${BRAND.paper};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(opts.preheader)}</div>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.paper};font-family:${FONT_STACK};color:${BRAND.inkSoft};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.paper};padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;box-shadow:0 14px 36px -22px rgba(61,40,20,.18);">
      <tr><td style="height:4px;background:linear-gradient(90deg,${BRAND.accent} 0%,${BRAND.accentDark} 50%,${BRAND.accent} 100%);"></td></tr>
      <tr><td align="center" style="padding:22px 24px 18px;background:#FFF9F0;border-bottom:1px solid ${BRAND.border};">
        <a href="${APP_URL}" target="_blank" style="text-decoration:none;color:inherit;">
          <img src="${LOGO_URL}" width="44" height="44" alt="${BRAND_NAME}" style="display:block;margin:0 auto 8px;border:0;">
          <div style="font-family:${SERIF_STACK};font-size:20px;font-weight:700;color:${BRAND.ink};letter-spacing:.5px;line-height:1.1;">${BRAND_NAME}</div>
          <div style="margin-top:6px;font-size:10px;color:${BRAND.muted};letter-spacing:.22em;text-transform:uppercase;">${TAGLINE}</div>
        </a>
      </td></tr>
      <tr><td style="padding:28px 30px;">${inner}</td></tr>
      <tr><td style="padding:16px 30px;background:${BRAND.cream2};border-top:1px solid ${BRAND.border};text-align:center;font-size:12px;color:${BRAND.muted};">
        © 2026 ${BRAND_NAME} · Hand-baked in Fifth Settlement, New Cairo<br>
        <a href="${APP_URL}/help" style="color:${BRAND.accentDark};text-decoration:none;font-weight:600;">Help center</a> ·
        <a href="${APP_URL}/contact" style="color:${BRAND.accentDark};text-decoration:none;font-weight:600;">Contact</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

const heading = `font-family:${SERIF_STACK};color:${BRAND.ink};font-size:22px;margin:0 0 12px;font-weight:700;line-height:1.2;`;
const body = `font-size:14.5px;color:${BRAND.inkSoft};line-height:1.65;margin:0 0 12px;`;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* -------------------------------------------------------------------------- *
 * Contact form — internal notification (sent to the brand inbox)              *
 * -------------------------------------------------------------------------- */

export function contactNotification(opts: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  return {
    subject: `[Contact] ${opts.subject}`,
    html: shell(
      `
      <span style="display:inline-block;background:${BRAND.accentTint};color:${BRAND.accentDark};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:5px 12px;border-radius:999px;margin-bottom:14px;border:1px solid ${BRAND.borderSoft};">New message</span>
      <h1 style="${heading}">${esc(opts.subject)}</h1>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;font-size:13px;color:${BRAND.inkSoft};">
        <tr><td style="padding:4px 0;color:${BRAND.muted};width:80px;">From</td><td style="padding:4px 0;color:${BRAND.ink};font-weight:600;">${esc(opts.name)} &lt;${esc(opts.email)}&gt;</td></tr>
      </table>
      <hr style="border:none;border-top:1px dashed ${BRAND.borderSoft};margin:14px 0;">
      <p style="${body};white-space:pre-line;">${esc(opts.message)}</p>
      <p style="margin-top:18px;"><a href="mailto:${esc(opts.email)}?subject=Re:%20${encodeURIComponent(opts.subject)}" style="display:inline-block;background:${BRAND.accentDark};color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:999px;font-size:13px;font-weight:700;">Reply to ${esc(opts.name.split(/\s+/)[0])}</a></p>
    `,
      { title: `[Contact] ${opts.subject}`, preheader: `${opts.name} just messaged us about "${opts.subject}".` },
    ),
  };
}

/* -------------------------------------------------------------------------- *
 * Contact form — customer auto-reply (sent to the person who submitted)       *
 * -------------------------------------------------------------------------- */

export function contactAutoReply(opts: { name: string; subject: string }) {
  const firstName = (opts.name?.split(/\s+/)[0] ?? "there").trim() || "there";
  return {
    subject: `We got your message, ${firstName} — Cookie Bite`,
    html: shell(
      `
      <span style="display:inline-block;background:#E2F1E8;color:#5DAA84;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:5px 12px;border-radius:999px;margin-bottom:14px;border:1px solid #E2F1E8;">Message received</span>
      <h1 style="${heading}">Thanks for reaching out, ${esc(firstName)}.</h1>
      <p style="${body}">We just received your message about <strong>"${esc(opts.subject)}"</strong>. Someone from our small team will read it and reply personally — usually within one business day (Sun–Thu, 10am–8pm Cairo time).</p>
      <p style="${body}">In the meantime, you can browse our latest bake or peek at the most common questions in our Help Center:</p>
      <p style="margin:18px 0;">
        <a href="${APP_URL}/shop" style="display:inline-block;background:${BRAND.accentDark};color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:999px;font-size:13px;font-weight:700;margin-right:8px;">Browse this week</a>
        <a href="${APP_URL}/help" style="display:inline-block;background:transparent;color:${BRAND.accentDark};text-decoration:none;padding:10px 22px;border-radius:999px;font-size:13px;font-weight:700;border:1.5px solid ${BRAND.borderSoft};">Help Center</a>
      </p>
      <p style="${body};font-size:13px;color:${BRAND.muted};">If your question is urgent, message us on WhatsApp at <a href="https://wa.me/201140165995" style="color:${BRAND.accentDark};font-weight:600;">01140165995</a> — fastest reply during opening hours.</p>
    `,
      {
        title: `We got your message, ${firstName}`,
        preheader: `Thanks for reaching out — we'll reply personally within one business day.`,
      },
    ),
  };
}
