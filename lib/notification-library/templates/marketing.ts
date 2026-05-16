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

const PROMOTIONAL_BODY = `
<div class="email-wrapper">
  <div class="email-header" style="background:#1a1a2e;padding:32px;">
    <div class="logo">YOUR STORE</div>
    <div style="margin-top:16px;font-size:32px;font-weight:800;color:#fff;letter-spacing:-1px;font-family:Arial;">{{offer_percentage}}% OFF</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:4px;font-family:Arial;">{{offer_name}} · Ends {{expiry_date}}</div>
  </div>
  <div class="email-body">
    <h1>Exclusive offer just for you</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>For a limited time, enjoy <strong>{{offer_percentage}}% off</strong> sitewide. Use the code below at checkout — no minimum order required.</p>
    <div class="tracking-box">
      <p style="font-size:12px;color:#888;margin-bottom:6px;">YOUR DISCOUNT CODE</p>
      <div class="tracking-num" style="letter-spacing:4px;">{{promo_code}}</div>
      <p>Valid until {{expiry_date}}</p>
    </div>
    <div style="text-align:center;margin:24px 0;"><a class="cta-btn" href="{{shop_url}}">Shop the Sale</a></div>
    <hr class="divider">
    <p style="font-size:12px;color:#aaa;">Terms apply. Offer valid until {{expiry_date}} at 11:59 PM. Cannot be combined with other offers.</p>
  </div>
  <div class="email-footer"><p>© 2025 [Your Store]. All rights reserved.<br>{{company_address}}<br><a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{privacy_url}}">Privacy Policy</a></p></div>
</div>
`;

export const promotionalTemplate: TemplateBuilder = {
  meta: {
    key: "promotional",
    name: "Promotional Email",
    description: "Sitewide discount campaign email.",
    category: "marketing",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      offer_percentage: 20,
      offer_name: "Spring Sale",
      expiry_date: "31 May 2026",
      promo_code: "SPRING20",
      shop_url: "https://cookie-bite.com/shop",
      company_address: "Cookie Bite Bakery, Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...promotionalTemplate.meta.sampleVars, ...vars };
    return {
      key: promotionalTemplate.meta.key,
      subject: `${merged.offer_percentage}% off sitewide — ${merged.offer_name}`,
      preheader: `Use code ${merged.promo_code} until ${merged.expiry_date}.`,
      html: buildEmail(PROMOTIONAL_BODY, merged, {
        title: "Exclusive offer",
        preheader: `Use code ${merged.promo_code} until ${merged.expiry_date}.`,
        lang: options?.lang,
      }),
    };
  },
};

export const MARKETING_TEMPLATES: TemplateBuilder[] = [promotionalTemplate];
