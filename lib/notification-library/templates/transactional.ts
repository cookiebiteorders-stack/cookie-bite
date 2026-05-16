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

/* ─────────────────────────── Welcome ─────────────────────────── */

const WELCOME_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag">A warm welcome</span>
    <h1>Lovely to have you, {{first_name}}.</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>Welcome to <strong>Cookie Bite</strong> — a small bakery in New Cairo turning real butter, premium chocolate and a lot of patience into hand-finished cookies. Your account is ready, and a treat is already on the table.</p>
    <div class="info-box"><p>🎁 <strong>A little hello gift —</strong> use <strong>{{welcome_code}}</strong> at checkout for <strong>{{welcome_discount}}% off</strong> your first box. Good for {{welcome_validity_days}} days.</p></div>
    <div style="text-align:center;margin:22px 0;"><a class="cta-btn" href="{{shop_url}}">Browse this week's flavors</a></div>
    <hr class="divider">
    <div class="two-col">
      <div class="col-box"><h4>Made fresh, daily</h4><p>Most boxes are baked the same day they leave our kitchen.</p></div>
      <div class="col-box"><h4>Free delivery over 500 EGP</h4><p>Across New Cairo and surrounding zones.</p></div>
    </div>
    <p style="font-size:13px;color:#9C8B7A;margin-top:18px;">Need anything? Just reply — a real person reads every email. Or peek at our <a href="{{help_url}}">Help Center</a>.</p>
  </div>
  <div class="email-footer"><p>© 2026 [Your Store] · Hand-baked in {{company_address}}<br><a href="{{shop_url}}">Shop</a> · <a href="{{help_url}}">Help</a> · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
</div>
`;

export const welcomeTemplate: TemplateBuilder = {
  meta: {
    key: "welcome",
    name: "Welcome Email",
    description: "Sent to a customer right after they create an account.",
    category: "transactional",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      shop_url: "https://cookie-bite.com/shop",
      welcome_code: "WELCOME10",
      welcome_discount: 10,
      welcome_validity_days: 30,
      help_url: "https://cookie-bite.com/help",
      company_address: "Fifth Settlement, New Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...welcomeTemplate.meta.sampleVars, ...vars };
    return {
      key: welcomeTemplate.meta.key,
      subject: `A warm welcome from Cookie Bite, ${merged.first_name ?? "there"}`,
      preheader: `Your account is ready — and your ${merged.welcome_discount}% welcome treat is waiting.`,
      html: buildEmail(WELCOME_BODY, merged, {
        title: "Welcome to Cookie Bite",
        preheader: `Your account is ready — and your ${merged.welcome_discount}% welcome treat is waiting.`,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── Order confirmed ─────────────────────────── */

const ORDER_CONFIRMATION_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag">Order confirmed</span>
    <h1>Thank you, {{first_name}} — we got your order.</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>Your order <strong>#{{order_number}}</strong> is confirmed. We'll start hand-finishing the moment your batch is ready in the kitchen.</p>
    <table class="order-table">
      <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:end;">Price</th></tr></thead>
      <tbody>
        {{items_rows}}
        <tr class="total-row"><td colspan="2">Total</td><td style="text-align:end;">{{total_amount}}</td></tr>
      </tbody>
    </table>
    <div class="two-col">
      <div class="col-box"><h4>Delivering to</h4><p>{{customer_name}}<br>{{shipping_address}}</p></div>
      <div class="col-box"><h4>Paid with</h4><p>{{payment_method}}<br><strong>{{total_amount}}</strong></p></div>
    </div>
    <div class="info-box"><p>Want to add a handwritten gift note? Reply within an hour and we'll tuck one in — at no charge.</p></div>
    <div style="text-align:center;margin:22px 0;"><a class="cta-btn" href="{{order_url}}">Track this order</a></div>
    <hr class="divider">
    <p style="font-size:13px;color:#9C8B7A;">Questions? Just reply, or message us on WhatsApp — we usually answer within the hour.</p>
  </div>
  <div class="email-footer"><p>© 2026 [Your Store] · Hand-baked in {{company_address}}<br><a href="{{order_url}}">My orders</a> · <a href="{{privacy_url}}">Privacy</a> · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
</div>
`;

export const orderConfirmedTemplate: TemplateBuilder = {
  meta: {
    key: "order-confirmed",
    name: "Order Confirmation",
    description: "Sent immediately after a customer places an order.",
    category: "transactional",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      order_number: "10042",
      items_rows:
        "<tr><td>Classic Cookie Box (12)</td><td style=\"text-align:center;\">1</td><td style=\"text-align:end;\">320.00 EGP</td></tr>" +
        "<tr><td>Chocolate Chunk Box (6)</td><td style=\"text-align:center;\">2</td><td style=\"text-align:end;\">360.00 EGP</td></tr>",
      total_amount: "680.00 EGP",
      customer_name: "Sara Ahmed",
      shipping_address: "12 Tahrir St, New Cairo, Egypt",
      payment_method: "Credit Card · Visa •••• 4242",
      order_url: "https://cookie-bite.com/account",
      company_address: "Fifth Settlement, New Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...orderConfirmedTemplate.meta.sampleVars, ...vars };
    return {
      key: orderConfirmedTemplate.meta.key,
      subject: `Order #${merged.order_number} confirmed — your cookies are queued for the oven`,
      preheader: `Thanks ${merged.first_name ?? ""} — total ${merged.total_amount}. We've started hand-finishing your batch.`,
      html: buildEmail(ORDER_CONFIRMATION_BODY, merged, {
        title: "Order confirmed",
        preheader: `Thanks ${merged.first_name ?? ""} — total ${merged.total_amount}.`,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── Shipped / Out for delivery ─────────────────────────── */

const ORDER_SHIPPED_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag info">On the way</span>
    <h1>Your cookies are out for delivery, {{first_name}}.</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>Your order <strong>#{{order_number}}</strong> just left our kitchen with <strong>{{carrier_name}}</strong>. They're packed warm-from-the-oven (well, room temperature — food safety!) and ready to land at your door.</p>
    <div class="tracking-box">
      <p>TRACKING NUMBER</p>
      <div class="tracking-num">{{tracking_number}}</div>
      <p style="color:#5C3A21;font-weight:500;letter-spacing:0;">Estimated delivery · {{estimated_delivery}}</p>
    </div>
    <div style="text-align:center;margin:18px 0;"><a class="cta-btn" href="{{tracking_url}}">Track my package</a></div>
    <div class="info-box"><p><strong>Storage tip:</strong> if you can't enjoy them right away, keep your cookies in a sealed container at room temperature — they stay perfect for up to 7 days.</p></div>
    <hr class="divider">
    <p style="font-size:13px;color:#9C8B7A;">Didn't expect this? Please <a href="{{contact_url}}">contact us</a> right away — we'll sort it out.</p>
  </div>
  <div class="email-footer"><p>© 2026 [Your Store] · Hand-baked in {{company_address}}<br><a href="{{tracking_url}}">Track</a> · <a href="{{contact_url}}">Help</a> · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
</div>
`;

export const orderShippedTemplate: TemplateBuilder = {
  meta: {
    key: "order-shipped",
    name: "Order Shipped",
    description: "Sent when a customer's order leaves the warehouse.",
    category: "transactional",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      order_number: "10042",
      tracking_number: "AR-9837456120-EG",
      carrier_name: "Aramex",
      estimated_delivery: "Tue, 19 May",
      tracking_url: "https://track.aramex.com/AR-9837456120-EG",
      contact_url: "https://cookie-bite.com/contact",
      company_address: "Fifth Settlement, New Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...orderShippedTemplate.meta.sampleVars, ...vars };
    return {
      key: orderShippedTemplate.meta.key,
      subject: `Your Cookie Bite order #${merged.order_number} is on the way`,
      preheader: `Tracking ${merged.tracking_number} · ${merged.carrier_name} · arrives ${merged.estimated_delivery}`,
      html: buildEmail(ORDER_SHIPPED_BODY, merged, {
        title: "Order on the way",
        preheader: `Tracking ${merged.tracking_number} · ${merged.carrier_name}`,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── Delivered ─────────────────────────── */

const ORDER_DELIVERED_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag green">Delivered</span>
    <h1>Hope every bite is perfect, {{first_name}}.</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>Your order <strong>#{{order_number}}</strong> was delivered on <strong>{{delivery_date}}</strong>. We hope the box arrived as fresh as the day we baked it.</p>
    <div class="info-box"><p><strong>Delivered to:</strong> {{shipping_address}}</p></div>
    <p>If anything's not quite right, you have <strong>{{return_window}} days</strong> to let us know — we take freshness seriously and we'll always make it right.</p>
    <div style="text-align:center;margin:20px 0;"><a class="cta-btn" href="{{order_url}}">View order details</a></div>
    <hr class="divider">
    <p style="font-size:14px;color:#3D2814;font-weight:600;">A favour to ask 🍪</p>
    <p>Loved them? A short review helps other folks discover us — and tells our bakers they did good. <a href="{{review_url}}">Leave a quick review</a>.</p>
  </div>
  <div class="email-footer"><p>© 2026 [Your Store] · Hand-baked in {{company_address}}<br><a href="{{review_url}}">Leave a review</a> · <a href="{{support_url}}">Help</a> · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
</div>
`;

export const orderDeliveredTemplate: TemplateBuilder = {
  meta: {
    key: "order-delivered",
    name: "Order Delivered",
    description: "Confirms successful delivery and surfaces the return window.",
    category: "transactional",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      order_number: "10042",
      delivery_date: "Tue, 19 May",
      shipping_address: "12 Tahrir St, New Cairo, Egypt",
      return_window: 14,
      order_url: "https://cookie-bite.com/account",
      review_url: "https://cookie-bite.com/account",
      support_url: "https://cookie-bite.com/contact",
      company_address: "Fifth Settlement, New Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...orderDeliveredTemplate.meta.sampleVars, ...vars };
    return {
      key: orderDeliveredTemplate.meta.key,
      subject: `Your Cookie Bite box has arrived 🍪`,
      preheader: `Delivered ${merged.delivery_date} · ${merged.return_window}-day quality guarantee`,
      html: buildEmail(ORDER_DELIVERED_BODY, merged, {
        title: "Order delivered",
        preheader: `Delivered ${merged.delivery_date}`,
        lang: options?.lang,
      }),
    };
  },
};

/* ─────────────────────────── Refund processed ─────────────────────────── */

const REFUND_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag info">Refund processed</span>
    <h1>Your refund is on its way, {{first_name}}.</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>We've completed the refund on order <strong>#{{order_number}}</strong>. Sorry the box wasn't perfect — we'd love another chance whenever you're ready.</p>
    <div class="two-col">
      <div class="col-box"><h4>Refund amount</h4><p style="font-size:18px;font-weight:700;">{{refund_amount}}</p></div>
      <div class="col-box"><h4>Refunded to</h4><p>{{payment_method}}</p></div>
    </div>
    <div class="info-box"><p>⏳ Please allow <strong>{{processing_days}} business days</strong> for the amount to appear in your account — it depends on your bank.</p></div>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div class="step-content"><h4>Refund initiated</h4><p>Sent from our side on {{refund_date}}.</p></div></div>
      <div class="step"><div class="step-num">2</div><div class="step-content"><h4>Bank processing</h4><p>Your bank or card network handles the next step.</p></div></div>
      <div class="step"><div class="step-num">3</div><div class="step-content"><h4>Funds arrive</h4><p>Typically within {{processing_days}} business days.</p></div></div>
    </div>
    <div style="text-align:center;margin-top:22px;"><a class="cta-btn" href="{{order_url}}">View refund details</a></div>
  </div>
  <div class="email-footer"><p>© 2026 [Your Store] · Hand-baked in {{company_address}}<br><a href="{{order_url}}">Order details</a> · <a href="{{privacy_url}}">Privacy</a> · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
</div>
`;

export const refundConfirmedTemplate: TemplateBuilder = {
  meta: {
    key: "refund-confirmed",
    name: "Refund Confirmed",
    description: "Notifies the customer that their refund has been processed.",
    category: "transactional",
    variant: "email",
    sampleVars: {
      first_name: "Sara",
      order_number: "10042",
      refund_amount: "320.00 EGP",
      payment_method: "Credit Card · Visa •••• 4242",
      processing_days: 5,
      refund_date: "16 May 2026",
      order_url: "https://cookie-bite.com/account",
      company_address: "Fifth Settlement, New Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...refundConfirmedTemplate.meta.sampleVars, ...vars };
    return {
      key: refundConfirmedTemplate.meta.key,
      subject: `Refund processed for order #${merged.order_number}`,
      preheader: `${merged.refund_amount} on its way back to ${merged.payment_method}.`,
      html: buildEmail(REFUND_BODY, merged, {
        title: "Refund processed",
        preheader: `${merged.refund_amount} refunded`,
        lang: options?.lang,
      }),
    };
  },
};

export const TRANSACTIONAL_TEMPLATES: TemplateBuilder[] = [
  welcomeTemplate,
  orderConfirmedTemplate,
  orderShippedTemplate,
  orderDeliveredTemplate,
  refundConfirmedTemplate,
];
