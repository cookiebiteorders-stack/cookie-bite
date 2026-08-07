import { applyVars, renderShell } from "../shell";
import { pickArEmail } from "./bodies-ar";
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

type EmailVars = Record<string, string | number | undefined | null>;

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

/* ─────────────────────────── Order cancellation ─────────────────────────── */

const ORDER_CANCELLATION_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag red">Cancelled</span>
    <h1>Your order has been cancelled.</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>Your order <strong>#{{order_number}}</strong> from {{order_date}} is now cancelled — exactly as you requested. No worries; if you change your mind, your favourites are right where you left them.</p>
    <div class="kpi2">
      <div class="k"><div class="kl">Order total</div><div class="kv">{{order_total}}</div></div>
      <div class="k"><div class="kl">Refund method</div><div class="kv" style="font-size:14px;">{{payment_method}}</div></div>
    </div>
    <div class="ibox"><p>Your refund of <strong>{{refund_amount}}</strong> will land back on your original payment method within <strong>{{processing_days}} business days</strong>.</p></div>
    <p>Re-baking the moment? Browse this week's flavors — we'd love to send another box your way.</p>
    <div style="text-align:center;margin-top:18px;"><a class="cta" href="{{shop_url}}">Shop again</a></div>
    <hr class="divider">
    <p style="font-size:12px;color:#9C8B7A;">Cancellation reason: {{cancel_reason}}</p>
  </div>
  <div class="ef"><p>© 2026 [Your Store] · <a href="{{support_url}}">Talk to us</a> · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
</div>
`;

export const orderCancellationTemplate: TemplateBuilder = {
  meta: {
    key: "order-cancelled",
    name: "Order Cancellation",
    description: "Confirms that an order has been cancelled and a refund issued.",
    category: "lifecycle",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      order_number: "10042",
      order_date: "14 May 2026",
      order_total: "680.00 EGP",
      payment_method: "Visa •••• 4242",
      refund_amount: "680.00 EGP",
      processing_days: 5,
      cancel_reason: "Customer request",
      shop_url: "https://cookie-bite.com/shop",
      support_url: "https://cookie-bite.com/contact",
      unsubscribe_url: "#",
    },
  },
  build(vars, options) {
    const merged = { ...orderCancellationTemplate.meta.sampleVars, ...vars };
    return {
      key: orderCancellationTemplate.meta.key,
      subject: `Order #${merged.order_number} cancelled — refund of ${merged.refund_amount} on its way`,
      preheader: `Refund of ${merged.refund_amount} processed in ${merged.processing_days} business days.`,
      html: buildEmail(ORDER_CANCELLATION_BODY, merged, {
        title: "Order cancelled",
        preheader: `Refund ${merged.refund_amount}`,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── Shipping delay ─────────────────────────── */

const SHIPPING_DELAY_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag amber">Slight delay</span>
    <h1>A small heads-up about your order, {{first_name}}.</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>We owe you an apology — order <strong>#{{order_number}}</strong> is running a little behind. We don't take your time for granted, and our team is on it.</p>
    <div class="ibox" style="border-left-color:#D97706;">
      <p><strong>Original delivery:</strong> {{original_date}}<br>
      <strong>New estimated delivery:</strong> <span style="color:#D97706;font-weight:700;">{{new_date}}</span><br>
      <strong>Reason:</strong> {{delay_reason}}</p>
    </div>
    <div class="steps">
      <div class="step"><div class="snum">1</div><div class="scnt"><h4>Order dispatched</h4><p>Left our kitchen on {{dispatch_date}}.</p></div></div>
      <div class="step"><div class="snum">2</div><div class="scnt"><h4>In transit</h4><p>With {{carrier_name}} — tracking <strong>{{tracking_number}}</strong>.</p></div></div>
      <div class="step"><div class="snum">3</div><div class="scnt"><h4>New delivery window</h4><p>Between {{new_date_from}} and {{new_date_to}}.</p></div></div>
    </div>
    <div style="text-align:center;margin-top:18px;"><a class="cta" href="{{tracking_url}}">Track my order</a></div>
    <div class="info-box"><p>🍪 <strong>On us, for the wait —</strong> use <strong>{{apology_code}}</strong> for <strong>{{discount}}% off</strong> your next box.</p></div>
  </div>
  <div class="ef"><p>© 2026 [Your Store] · <a href="{{help_url}}">Help</a> · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
</div>
`;

export const shippingDelayTemplate: TemplateBuilder = {
  meta: {
    key: "shipping-delay",
    name: "Shipping Delay",
    description: "Apologises for a shipping delay and offers a discount.",
    category: "lifecycle",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      order_number: "10042",
      original_date: "17 May",
      new_date: "20 May",
      delay_reason: "Carrier capacity issue",
      dispatch_date: "15 May",
      carrier_name: "Aramex",
      tracking_number: "AR-9837456120-EG",
      new_date_from: "19 May",
      new_date_to: "21 May",
      apology_code: "SORRY10",
      discount: 10,
      tracking_url: "https://track.aramex.com/AR-9837456120-EG",
      unsubscribe_url: "#",
      help_url: "https://cookie-bite.com/help",
    },
  },
  build(vars, options) {
    const merged = { ...shippingDelayTemplate.meta.sampleVars, ...vars };
    return {
      key: shippingDelayTemplate.meta.key,
      subject: `Quick update on order #${merged.order_number} — slight delay`,
      preheader: `New window: ${merged.new_date_from}–${merged.new_date_to}. ${merged.discount}% off your next box on us.`,
      html: buildEmail(SHIPPING_DELAY_BODY, merged, {
        title: "Shipping delay",
        preheader: `New delivery window: ${merged.new_date_from}–${merged.new_date_to}`,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── Abandoned cart ─────────────────────────── */

const ABANDONED_CART_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag warning">Still warm in your cart</span>
    <h1>Don't let them sell out, {{first_name}}.</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>You left a few cookies in your cart — and small batches go fast. Pick up right where you left off:</p>
    <table class="order-table">
      <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:end;">Price</th></tr></thead>
      <tbody>
        {{items_rows}}
        <tr class="total-row"><td colspan="2">Cart total</td><td style="text-align:end;">{{cart_total}}</td></tr>
      </tbody>
    </table>
    <div style="text-align:center;margin:22px 0;"><a class="cta-btn" href="{{cart_url}}">Finish my order</a></div>
    <div class="info-box"><p>🍪 <strong>A nudge from us —</strong> use <strong>{{promo_code}}</strong> at checkout for an extra <strong>{{discount}}% off</strong> today.</p></div>
    <p style="font-size:13px;color:#9C8B7A;">This treat expires in {{offer_expiry}}.</p>
  </div>
  <div class="email-footer"><p>© 2026 [Your Store] · Hand-baked in {{company_address}}<br><a href="{{cart_url}}">My cart</a> · <a href="{{privacy_url}}">Privacy</a> · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
</div>
`;

export const abandonedCartTemplate: TemplateBuilder = {
  meta: {
    key: "abandoned-cart",
    name: "Abandoned Cart",
    description: "Reminds customers about items left in their cart.",
    category: "lifecycle",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      items_rows:
        "<tr><td>Classic Cookie Box (12)</td><td style=\"text-align:center;\">1</td><td style=\"text-align:end;\">320.00 EGP</td></tr>" +
        "<tr><td>Chocolate Chunk Box (6)</td><td style=\"text-align:center;\">1</td><td style=\"text-align:end;\">180.00 EGP</td></tr>",
      cart_total: "500.00 EGP",
      promo_code: "COMEBACK5",
      discount: 5,
      offer_expiry: "24 hours",
      cart_url: "https://cookie-bite.com/checkout",
      company_address: "Fifth Settlement, New Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...abandonedCartTemplate.meta.sampleVars, ...vars };
    const enSubject = `Your cookies are still warm in the cart 🍪`;
    const enPreheader = `Cart total ${merged.cart_total}. Use ${merged.promo_code} for ${merged.discount}% off — ${merged.offer_expiry} left.`;
    const copy = resolveCopy(
      "abandoned-cart",
      options?.lang,
      {
        body: ABANDONED_CART_BODY,
        subject: enSubject,
        preheader: enPreheader,
        title: "Your cart is waiting",
      },
      merged,
    );
    return {
      key: abandonedCartTemplate.meta.key,
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

/* ─────────────────────────── Review request ─────────────────────────── */

const REVIEW_REQUEST_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag">A small ask</span>
    <h1>How were your cookies, {{first_name}}?</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>We hope your <strong>{{product_name}}</strong> brought a little joy. Our team reads every single review — it's how we get better, and it tells future cookie-lovers what to expect.</p>
    <div style="text-align:center;margin:18px 0 22px;">
      <div class="stars">★ ★ ★ ★ ★</div>
      <p style="font-size:13px;color:#9C8B7A;margin-bottom:18px;">Tap a star — takes 30 seconds.</p>
      <a class="cta-btn" href="{{review_url}}">Leave a review</a>
    </div>
    <hr class="divider">
    <p style="font-size:13px;color:#9C8B7A;">Reviewing order <strong>#{{order_number}}</strong>. Anything off? Just reply — we'd rather fix it than read it.</p>
  </div>
  <div class="email-footer"><p>© 2026 [Your Store] · Hand-baked in {{company_address}}<br><a href="{{review_url}}">Leave a review</a> · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
</div>
`;

export const reviewRequestTemplate: TemplateBuilder = {
  meta: {
    key: "review-request",
    name: "Review Request",
    description: "Asks the customer to leave a review after delivery.",
    category: "lifecycle",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      product_name: "Classic Cookie Box (12)",
      order_number: "10042",
      review_url: "https://cookie-bite.com/account",
      company_address: "Fifth Settlement, New Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...reviewRequestTemplate.meta.sampleVars, ...vars };
    return {
      key: reviewRequestTemplate.meta.key,
      subject: `How were your ${merged.product_name}? ⭐`,
      preheader: "Tap a star and help future cookie-lovers find their favourite.",
      html: buildEmail(REVIEW_REQUEST_BODY, merged, {
        title: "Leave a review",
        preheader: "Tap a star — takes 30 seconds.",
        lang: options?.lang,
      }),
    };
  },
};

export const LIFECYCLE_TEMPLATES: TemplateBuilder[] = [
  orderCancellationTemplate,
  shippingDelayTemplate,
  abandonedCartTemplate,
  reviewRequestTemplate,
];
