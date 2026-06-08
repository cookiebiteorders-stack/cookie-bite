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
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag">Limited time</span>
    <h1>{{offer_percentage}}% off, just for you.</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>Our <strong>{{offer_name}}</strong> is on, and we'd love to send you a fresh box. For a limited time, take <strong>{{offer_percentage}}% off</strong> sitewide — no minimum order, no fine print.</p>
    <div class="pts-box">
      <div class="pts">{{offer_percentage}}% OFF</div>
      <p>Use code <strong>{{promo_code}}</strong> at checkout · ends {{expiry_date}}</p>
    </div>
    <div style="text-align:center;margin:14px 0 24px;"><a class="cta-btn" href="{{shop_url}}">Shop the sale</a></div>
    <div class="two-col">
      <div class="col-box"><h4>What's good right now</h4><p>Classic Cookie Box · Chocolate Chunk · Vanilla 24-pack.</p></div>
      <div class="col-box"><h4>Free local delivery</h4><p>On orders over {{free_shipping_threshold_egp}} EGP across New Cairo zones.</p></div>
    </div>
    <hr class="divider">
    <p style="font-size:12px;color:#9C8B7A;">Code <strong>{{promo_code}}</strong> valid until {{expiry_date}} at 11:59 PM. One use per customer; can't be combined with other offers.</p>
  </div>
  <div class="email-footer"><p>© 2026 [Your Store] · Hand-baked in {{company_address}}<br><a href="{{shop_url}}">Shop</a> · <a href="{{privacy_url}}">Privacy</a> · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
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
      offer_name: "Spring sale",
      expiry_date: "31 May 2026",
      promo_code: "SPRING20",
      shop_url: "https://cookie-bite.com/shop",
      company_address: "Fifth Settlement, New Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...promotionalTemplate.meta.sampleVars, ...vars };
    return {
      key: promotionalTemplate.meta.key,
      subject: `${merged.offer_percentage}% off at Cookie Bite — ${merged.offer_name}`,
      preheader: `Use ${merged.promo_code} at checkout — ends ${merged.expiry_date}.`,
      html: buildEmail(PROMOTIONAL_BODY, merged, {
        title: "Limited time offer",
        preheader: `Use ${merged.promo_code} until ${merged.expiry_date}.`,
        lang: options?.lang,
      }),
    };
  },
};

export const MARKETING_TEMPLATES: TemplateBuilder[] = [promotionalTemplate];
