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

const BACK_IN_STOCK_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag green">Back in Stock</span>
    <h1>Great news — it's back!</h1>
    <p>Hi {{first_name}},</p>
    <p>You asked us to notify you, and we're happy to confirm that <strong>{{product_name}}</strong> is back in stock and ready to order.</p>
    <div class="kpi2">
      <div class="k"><div class="kl">Product</div><div class="kv" style="font-size:14px;">{{product_name}}</div></div>
      <div class="k"><div class="kl">Price</div><div class="kv">{{product_price}}</div></div>
    </div>
    <div class="ibox"><p>Stock is limited — we can't guarantee availability. Order now to avoid missing out again.</p></div>
    <div style="text-align:center;"><a class="cta" href="{{product_url}}">Buy Now</a></div>
    <hr class="divider">
    <p style="font-size:12px;color:#aaa;">You're receiving this because you signed up for a restock alert. <a href="{{manage_url}}" style="color:#888;">Manage alerts</a>.</p>
  </div>
  <div class="ef"><p>© 2025 [Your Store] · <a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{privacy_url}}">Privacy Policy</a></p></div>
</div>
`;

export const backInStockTemplate: TemplateBuilder = {
  meta: {
    key: "back-in-stock",
    name: "Back in Stock",
    description: "Tells a customer that a wishlisted product is available again.",
    category: "retention",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      product_name: "Vanilla Cookie Box (24)",
      product_price: "420.00 EGP",
      product_url: "https://cookie-bite.com/p/vanilla-cookie-box-24",
      manage_url: "https://cookie-bite.com/account",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...backInStockTemplate.meta.sampleVars, ...vars };
    return {
      key: backInStockTemplate.meta.key,
      subject: `${merged.product_name} is back in stock`,
      preheader: `Now ${merged.product_price}. Limited stock.`,
      html: buildEmail(BACK_IN_STOCK_BODY, merged, {
        title: "Back in stock",
        preheader: `Now ${merged.product_price}.`,
        lang: options?.lang,
      }),
    };
  },
};

const BIRTHDAY_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag purple">Happy Birthday!</span>
    <h1>Your birthday gift is here</h1>
    <p>Hi {{first_name}},</p>
    <p>Wishing you a wonderful birthday from all of us at <strong>[Your Store]</strong>. To celebrate your special day, we've put together a gift just for you — no strings attached.</p>
    <div class="pts-box">
      <div class="pts">{{discount}}% OFF</div>
      <p>Use code <strong>{{birthday_code}}</strong> at checkout</p>
    </div>
    <div class="ibox"><p>Valid from <strong>{{valid_from}}</strong> to <strong>{{valid_to}}</strong>. Applies to all products, no minimum order. One use per customer.</p></div>
    <div style="text-align:center;"><a class="cta" href="{{shop_url}}">Claim My Birthday Gift</a></div>
  </div>
  <div class="ef"><p>© 2025 [Your Store] · <a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{privacy_url}}">Privacy Policy</a></p></div>
</div>
`;

export const birthdayTemplate: TemplateBuilder = {
  meta: {
    key: "birthday",
    name: "Birthday Offer",
    description: "Sends a birthday discount code to a customer.",
    category: "retention",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      discount: 15,
      birthday_code: "BDAY15",
      valid_from: "16 May 2026",
      valid_to: "23 May 2026",
      shop_url: "https://cookie-bite.com/shop",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...birthdayTemplate.meta.sampleVars, ...vars };
    return {
      key: birthdayTemplate.meta.key,
      subject: `Happy birthday, ${merged.first_name}! 🎂`,
      preheader: `${merged.discount}% off, valid through ${merged.valid_to}`,
      html: buildEmail(BIRTHDAY_BODY, merged, {
        title: "Birthday offer",
        preheader: `${merged.discount}% off`,
        lang: options?.lang,
      }),
    };
  },
};

const LOYALTY_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag purple">Rewards Update</span>
    <h1>You've earned new points!</h1>
    <p>Hi {{first_name}},</p>
    <p>Thanks to your recent purchase, your rewards balance just got a boost. Here's your latest loyalty snapshot:</p>
    <div class="pts-box">
      <div class="pts">{{total_points}}</div>
      <p>Total reward points · {{tier_name}} member</p>
    </div>
    <div class="kpi2">
      <div class="k"><div class="kl">Points Earned</div><div class="kv">+{{earned_points}}</div></div>
      <div class="k"><div class="kl">Points to Next Tier</div><div class="kv">{{points_to_next}}</div></div>
    </div>
    <div class="steps">
      <div class="step"><div class="snum">1</div><div class="scnt"><h4>{{tier_1}} · 0 – {{t1_max}} pts</h4><p>Entry level benefits</p></div></div>
      <div class="step"><div class="snum">2</div><div class="scnt"><h4>{{tier_2}} · {{t2_min}} – {{t2_max}} pts</h4><p>Free shipping on all orders</p></div></div>
      <div class="step"><div class="snum">3</div><div class="scnt"><h4>{{tier_3}} · {{t3_min}}+ pts</h4><p>Exclusive deals and priority support</p></div></div>
    </div>
    <div style="text-align:center;"><a class="cta" href="{{redeem_url}}">Redeem My Points</a></div>
  </div>
  <div class="ef"><p>© 2025 [Your Store] · <a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{terms_url}}">Rewards Terms</a></p></div>
</div>
`;

export const loyaltyTemplate: TemplateBuilder = {
  meta: {
    key: "loyalty-rewards",
    name: "Loyalty & Rewards",
    description: "Loyalty points update after a qualifying purchase.",
    category: "retention",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      total_points: 1240,
      tier_name: "Silver",
      earned_points: 120,
      points_to_next: 760,
      tier_1: "Bronze",
      t1_max: 500,
      tier_2: "Silver",
      t2_min: 501,
      t2_max: 2000,
      tier_3: "Gold",
      t3_min: 2001,
      redeem_url: "https://cookie-bite.com/account/rewards",
      unsubscribe_url: "#",
      terms_url: "https://cookie-bite.com/rewards",
    },
  },
  build(vars, options) {
    const merged = { ...loyaltyTemplate.meta.sampleVars, ...vars };
    return {
      key: loyaltyTemplate.meta.key,
      subject: `You earned ${merged.earned_points} new reward points`,
      preheader: `Total: ${merged.total_points} points · ${merged.tier_name} member`,
      html: buildEmail(LOYALTY_BODY, merged, {
        title: "Rewards update",
        preheader: `Total: ${merged.total_points} points`,
        lang: options?.lang,
      }),
    };
  },
};

const WIN_BACK_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag purple">We miss you</span>
    <h1>It's been a while, {{first_name}}</h1>
    <p>Hi {{first_name}},</p>
    <p>We noticed you haven't shopped with us in <strong>{{days_inactive}} days</strong> and we'd love to welcome you back. A lot has changed — new arrivals, better prices, and an exclusive offer just for you.</p>
    <div style="background:#f0f4ff;border-radius:8px;padding:20px 24px;text-align:center;margin:18px 0;">
      <p style="font-size:12px;color:#888;margin-bottom:6px;">YOUR EXCLUSIVE CODE</p>
      <div style="font-size:26px;font-weight:700;color:#1a1a2e;letter-spacing:4px;">{{promo_code}}</div>
      <p style="font-size:13px;color:#555;margin-top:6px;">{{discount}}% off your next order — valid until {{expiry_date}}</p>
    </div>
    <div style="text-align:center;"><a class="cta" href="{{shop_url}}">Shop New Arrivals</a></div>
    <hr class="divider">
    <p style="font-size:12px;color:#aaa;">If you'd rather not hear from us, you can <a href="{{unsubscribe_url}}" style="color:#888;">unsubscribe here</a> — no hard feelings.</p>
  </div>
  <div class="ef"><p>© 2025 [Your Store] · <a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{privacy_url}}">Privacy Policy</a></p></div>
</div>
`;

export const winBackTemplate: TemplateBuilder = {
  meta: {
    key: "win-back",
    name: "Win-Back",
    description: "Re-engages dormant customers with an exclusive code.",
    category: "retention",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      days_inactive: 90,
      promo_code: "MISSYOU15",
      discount: 15,
      expiry_date: "31 May 2026",
      shop_url: "https://cookie-bite.com/shop",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...winBackTemplate.meta.sampleVars, ...vars };
    return {
      key: winBackTemplate.meta.key,
      subject: `We miss you, ${merged.first_name} — here's ${merged.discount}% off`,
      preheader: `Use ${merged.promo_code} before ${merged.expiry_date}`,
      html: buildEmail(WIN_BACK_BODY, merged, {
        title: "We miss you",
        preheader: `Use ${merged.promo_code}`,
        lang: options?.lang,
      }),
    };
  },
};

export const RETENTION_TEMPLATES: TemplateBuilder[] = [
  backInStockTemplate,
  birthdayTemplate,
  loyaltyTemplate,
  winBackTemplate,
];
