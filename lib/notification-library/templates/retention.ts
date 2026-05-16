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

/* ─────────────────────────── Back in stock ─────────────────────────── */

const BACK_IN_STOCK_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag green">Back in the kitchen</span>
    <h1>Good news — {{product_name}} is back.</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>You asked us to keep an eye out, and a fresh batch just came out of the oven. Quantities are limited (small batch, remember) — so don't sit on it for too long.</p>
    <div class="kpi2">
      <div class="k"><div class="kl">Product</div><div class="kv" style="font-size:14px;">{{product_name}}</div></div>
      <div class="k"><div class="kl">Price</div><div class="kv">{{product_price}}</div></div>
    </div>
    <div class="ibox"><p>Once this batch is gone, the next bake might take a few days. Order now to lock yours in.</p></div>
    <div style="text-align:center;margin-top:18px;"><a class="cta" href="{{product_url}}">Add to cart</a></div>
    <hr class="divider">
    <p style="font-size:12px;color:#9C8B7A;">You're receiving this because you signed up for a restock alert. <a href="{{manage_url}}">Manage alerts</a>.</p>
  </div>
  <div class="ef"><p>© 2026 [Your Store] · <a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{privacy_url}}">Privacy</a></p></div>
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
      subject: `${merged.product_name} is fresh out of the oven 🍪`,
      preheader: `Now ${merged.product_price}. Small batch — won't last long.`,
      html: buildEmail(BACK_IN_STOCK_BODY, merged, {
        title: "Back in stock",
        preheader: `Now ${merged.product_price}.`,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── Birthday ─────────────────────────── */

const BIRTHDAY_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag">A sweet little birthday gift</span>
    <h1>Happy birthday, {{first_name}}! 🎉</h1>
    <p>From all of us in the kitchen — wishing you a year as warm as a fresh-from-the-oven cookie. To celebrate, we put together a little gift, no strings attached.</p>
    <div class="pts-box">
      <div class="pts">{{discount}}% OFF</div>
      <p>Use code <strong>{{birthday_code}}</strong> at checkout</p>
    </div>
    <div class="ibox"><p>Valid from <strong>{{valid_from}}</strong> to <strong>{{valid_to}}</strong>. Works on everything, no minimum. One use per customer.</p></div>
    <div style="text-align:center;margin-top:18px;"><a class="cta" href="{{shop_url}}">Claim my birthday treat</a></div>
  </div>
  <div class="ef"><p>© 2026 [Your Store] · <a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{privacy_url}}">Privacy</a></p></div>
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
      subject: `Happy birthday, ${merged.first_name}! 🎂 Here's ${merged.discount}% off`,
      preheader: `${merged.discount}% off — valid through ${merged.valid_to}.`,
      html: buildEmail(BIRTHDAY_BODY, merged, {
        title: "Birthday offer",
        preheader: `${merged.discount}% off`,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── Loyalty / Bites rewards ─────────────────────────── */

const LOYALTY_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag green">Bites earned</span>
    <h1>You just earned {{earned_points}} new bites, {{first_name}}.</h1>
    <p>Thanks for your recent order — your Bites balance is climbing. Here's where you stand:</p>
    <div class="pts-box">
      <div class="pts">{{total_points}}</div>
      <p>Total bites · {{tier_name}} member</p>
    </div>
    <div class="kpi2">
      <div class="k"><div class="kl">Bites earned</div><div class="kv">+{{earned_points}}</div></div>
      <div class="k"><div class="kl">To next tier</div><div class="kv">{{points_to_next}}</div></div>
    </div>
    <div class="steps">
      <div class="step"><div class="snum">1</div><div class="scnt"><h4>{{tier_1}} · 0 – {{t1_max}} bites</h4><p>Welcome perks and birthday treat.</p></div></div>
      <div class="step"><div class="snum">2</div><div class="scnt"><h4>{{tier_2}} · {{t2_min}} – {{t2_max}} bites</h4><p>Free local delivery on every order.</p></div></div>
      <div class="step"><div class="snum">3</div><div class="scnt"><h4>{{tier_3}} · {{t3_min}}+ bites</h4><p>Early access to new flavors and priority care.</p></div></div>
    </div>
    <div style="text-align:center;margin-top:18px;"><a class="cta" href="{{redeem_url}}">Redeem my bites</a></div>
  </div>
  <div class="ef"><p>© 2026 [Your Store] · <a href="{{terms_url}}">Bites terms</a> · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
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
      redeem_url: "https://cookie-bite.com/account",
      unsubscribe_url: "#",
      terms_url: "https://cookie-bite.com/help/faq",
    },
  },
  build(vars, options) {
    const merged = { ...loyaltyTemplate.meta.sampleVars, ...vars };
    return {
      key: loyaltyTemplate.meta.key,
      subject: `+${merged.earned_points} bites earned · you're a ${merged.tier_name} member`,
      preheader: `Total ${merged.total_points} bites · ${merged.points_to_next} away from the next tier.`,
      html: buildEmail(LOYALTY_BODY, merged, {
        title: "Bites update",
        preheader: `Total ${merged.total_points} bites`,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── Win-back ─────────────────────────── */

const WIN_BACK_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag">We've missed you</span>
    <h1>It's been a while, {{first_name}}.</h1>
    <p>It's been <strong>{{days_inactive}} days</strong> since your last box — and a lot has changed in the kitchen. New flavors, better bundles, and a small "we miss you" gift to bring you back.</p>
    <div class="tracking-box">
      <p>YOUR EXCLUSIVE CODE</p>
      <div class="tracking-num">{{promo_code}}</div>
      <p style="color:#5C3A21;font-weight:500;letter-spacing:0;">{{discount}}% off your next order — valid until {{expiry_date}}</p>
    </div>
    <div style="text-align:center;margin:14px 0 22px;"><a class="cta" href="{{shop_url}}">See what's new</a></div>
    <hr class="divider">
    <p style="font-size:12px;color:#9C8B7A;">Rather not hear from us? You can <a href="{{unsubscribe_url}}">unsubscribe here</a> — no hard feelings, the door's always open.</p>
  </div>
  <div class="ef"><p>© 2026 [Your Store] · <a href="{{shop_url}}">Shop</a> · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
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
      subject: `We've missed you, ${merged.first_name} — ${merged.discount}% off, on us`,
      preheader: `Use ${merged.promo_code} before ${merged.expiry_date}.`,
      html: buildEmail(WIN_BACK_BODY, merged, {
        title: "We've missed you",
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
