/**
 * قوالب HTML بسيطة لـ Resend بدون React Email.
 * يمكن ترقيتها لاحقاً لـ @react-email/components.
 */

const baseStyle = `
  font-family: 'DM Sans', system-ui, sans-serif;
  background: #FBF3EA;
  color: #3C2A21;
  padding: 32px;
`;

const card = `
  background: #FFFFFF;
  border-radius: 18px;
  padding: 28px;
  max-width: 560px;
  margin: 0 auto;
  border: 1px solid #F2DDC5;
`;

const heading = `
  font-family: 'Playfair Display', Georgia, serif;
  color: #B25336;
  font-size: 22px;
  margin: 0 0 12px;
`;

function shell(inner: string) {
  return `<!doctype html><html><body style="${baseStyle}"><div style="${card}">${inner}</div></body></html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function welcomeEmail(opts: {
  name?: string;
  credentials?: { username: string; password: string };
}) {
  const name = opts.name ?? "there";
  const credsBlock = opts.credentials
    ? `
      <div style="margin:20px 0;padding:16px;background:#FFF8F0;border-radius:12px;border:1px solid #E8B896">
        <p style="margin:0 0 8px;font-weight:600;color:#B25336">Your login details</p>
        <p style="margin:0 0 4px;font-size:14px"><strong>Username:</strong> ${esc(opts.credentials.username)}</p>
        <p style="margin:0 0 8px;font-size:14px"><strong>Temporary password:</strong> ${esc(opts.credentials.password)}</p>
        <p style="margin:0;font-size:12px;color:#6b4a3a">You can sign in with email + this password, or continue using Google/social. Please change your password after signing in.</p>
        <p style="margin:10px 0 0;font-size:12px;color:#6b4a3a" dir="rtl">بيانات الدخول: اسم المستخدم وكلمة المرور أعلاه — يُفضّل تغيير كلمة المرور بعد أول تسجيل دخول.</p>
      </div>`
    : "";
  return {
    subject: `Welcome to Cookie Bite, ${name}!`,
    html: shell(`
      <h1 style="${heading}">Welcome, ${name}!</h1>
      <p>We're so happy you joined the Cookie Bite family.</p>
      ${credsBlock}
      <p>Browse our boxes and gift ideas, or reach out anytime —
        we're a small team and we love hearing from you.</p>
      <p style="margin-top:24px">— Cookie Bite Bakery</p>
    `),
  };
}

export function contactNotification(opts: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  return {
    subject: `[Contact] ${opts.subject}`,
    html: shell(`
      <h1 style="${heading}">New contact message</h1>
      <p><strong>From:</strong> ${opts.name} &lt;${opts.email}&gt;</p>
      <p><strong>Subject:</strong> ${opts.subject}</p>
      <hr style="border:none;border-top:1px dashed #DEB58D;margin:16px 0" />
      <p style="white-space:pre-line">${opts.message}</p>
    `),
  };
}

export function orderConfirmationEmail(opts: {
  name: string;
  orderId: string;
  total: number;
  itemsHtml: string;
}) {
  return {
    subject: `Order confirmed — #${opts.orderId}`,
    html: shell(`
      <h1 style="${heading}">Thank you, ${opts.name}!</h1>
      <p>Your order <strong>#${opts.orderId}</strong> has been received.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">${opts.itemsHtml}</table>
      <p style="margin-top:16px"><strong>Total:</strong> ${opts.total.toFixed(2)} EGP</p>
      <p style="margin-top:24px">We'll send a tracking update once it's on the way.</p>
    `),
  };
}
