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

const ORDER_CANCELLATION_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag red">Order Cancelled</span>
    <h1>Your order has been cancelled</h1>
    <p>Hi {{first_name}},</p>
    <p>Your order <strong>#{{order_number}}</strong> placed on {{order_date}} has been successfully cancelled as requested.</p>
    <div class="kpi2">
      <div class="k"><div class="kl">Order Total</div><div class="kv">{{order_total}}</div></div>
      <div class="k"><div class="kl">Refund Method</div><div class="kv" style="font-size:14px;">{{payment_method}}</div></div>
    </div>
    <div class="ibox"><p>Your refund of <strong>{{refund_amount}}</strong> will be processed within <strong>{{processing_days}} business days</strong> to your original payment method.</p></div>
    <p>Changed your mind? You can re-order anytime.</p>
    <div style="text-align:center;"><a class="cta" href="{{shop_url}}">Shop Again</a></div>
    <hr class="divider">
    <p style="font-size:12px;color:#aaa;">Cancellation reason: {{cancel_reason}}</p>
  </div>
  <div class="ef"><p>© 2025 [Your Store] · <a href="{{support_url}}">Contact Support</a> · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
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
      shop_url: "https://cookie-bite.com",
      support_url: "https://cookie-bite.com/contact",
      unsubscribe_url: "#",
    },
  },
  build(vars, options) {
    const merged = { ...orderCancellationTemplate.meta.sampleVars, ...vars };
    return {
      key: orderCancellationTemplate.meta.key,
      subject: `Order #${merged.order_number} cancelled`,
      preheader: `Refund of ${merged.refund_amount} in ${merged.processing_days} business days.`,
      html: buildEmail(ORDER_CANCELLATION_BODY, merged, {
        title: "Order cancelled",
        preheader: `Refund ${merged.refund_amount}`,
        lang: options?.lang,
      }),
    };
  },
};

const SHIPPING_DELAY_BODY = `
<div class="ew">
  <div class="eh" style="background:#7d4e00;"><div class="logo">YOUR STORE</div></div>
  <div class="eb">
    <span class="tag amber">Shipping Update</span>
    <h1>Your order is slightly delayed</h1>
    <p>Hi {{first_name}},</p>
    <p>We sincerely apologise — your order <strong>#{{order_number}}</strong> is experiencing an unexpected delay. We know your time matters, and we're working hard to resolve this.</p>
    <div class="ibox" style="border-left-color:#e65100;background:#fff8e1;">
      <p style="color:#7d4e00;"><strong>Previous delivery date:</strong> {{original_date}}<br>
      <strong>New estimated delivery:</strong> {{new_date}}<br>
      <strong>Reason:</strong> {{delay_reason}}</p>
    </div>
    <div class="steps">
      <div class="step"><div class="snum">1</div><div class="scnt"><h4>Order dispatched</h4><p>Left our warehouse on {{dispatch_date}}.</p></div></div>
      <div class="step"><div class="snum">2</div><div class="scnt"><h4>In transit</h4><p>Currently with {{carrier_name}} — tracking: {{tracking_number}}</p></div></div>
      <div class="step"><div class="snum">3</div><div class="scnt"><h4>New delivery window</h4><p>Expected between {{new_date_from}} and {{new_date_to}}.</p></div></div>
    </div>
    <div style="text-align:center;"><a class="cta" href="{{tracking_url}}">Track My Order</a></div>
    <p style="font-size:12px;color:#aaa;">As an apology, use <strong>{{apology_code}}</strong> for {{discount}}% off your next order.</p>
  </div>
  <div class="ef"><p>© 2025 [Your Store] · <a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{help_url}}">Help Center</a></p></div>
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
      subject: `Update on your order #${merged.order_number} — slight delay`,
      preheader: `New delivery window: ${merged.new_date_from}–${merged.new_date_to}`,
      html: buildEmail(SHIPPING_DELAY_BODY, merged, {
        title: "Shipping delay",
        preheader: `New delivery window: ${merged.new_date_from}–${merged.new_date_to}`,
        lang: options?.lang,
      }),
    };
  },
};

const ABANDONED_CART_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag warning">Reminder</span>
    <h1>Your cart is waiting for you</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>You left some items in your cart. Don't let them sell out — complete your purchase before they're gone.</p>
    <table class="order-table">
      <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
      <tbody>
        {{items_rows}}
        <tr class="total-row"><td colspan="2">Cart Total</td><td>{{cart_total}}</td></tr>
      </tbody>
    </table>
    <div style="text-align:center;margin:24px 0;"><a class="cta-btn" href="{{cart_url}}">Complete My Purchase</a></div>
    <div class="info-box"><p>🎁 <strong>Special offer:</strong> Use <strong>{{promo_code}}</strong> for an extra {{discount}}% off your order today.</p></div>
    <p style="font-size:13px;color:#888;">This offer expires in {{offer_expiry}}.</p>
  </div>
  <div class="email-footer"><p>© 2025 [Your Store]. All rights reserved.<br>{{company_address}}<br><a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{privacy_url}}">Privacy Policy</a></p></div>
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
        "<tr><td>Classic Cookie Box (12)</td><td>1</td><td>320.00 EGP</td></tr>" +
        "<tr><td>Chocolate Chunk Box (6)</td><td>1</td><td>180.00 EGP</td></tr>",
      cart_total: "500.00 EGP",
      promo_code: "COMEBACK5",
      discount: 5,
      offer_expiry: "24 hours",
      cart_url: "https://cookie-bite.com/cart",
      company_address: "Cookie Bite Bakery, Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...abandonedCartTemplate.meta.sampleVars, ...vars };
    return {
      key: abandonedCartTemplate.meta.key,
      subject: "You left something in your cart 🍪",
      preheader: `Cart total ${merged.cart_total}. Code ${merged.promo_code} for ${merged.discount}% off.`,
      html: buildEmail(ABANDONED_CART_BODY, merged, {
        title: "Cart reminder",
        preheader: `Cart total ${merged.cart_total}`,
        lang: options?.lang,
      }),
    };
  },
};

const REVIEW_REQUEST_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag">Feedback</span>
    <h1>How did we do?</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>We hope you're loving your recent purchase from <strong>[Your Store]</strong>. Your feedback means the world to us — and to other shoppers!</p>
    <p>It only takes 30 seconds. Click a star to rate your experience:</p>
    <div style="text-align:center;">
      <div class="stars">★ ★ ★ ★ ★</div>
      <p style="font-size:13px;color:#888;margin-bottom:20px;">Tap a star to leave your rating</p>
      <a class="cta-btn" href="{{review_url}}">Write a Review</a>
    </div>
    <hr class="divider">
    <p style="font-size:13px;color:#888;">Reviewing your order: <strong>{{product_name}}</strong> (Order #{{order_number}})</p>
  </div>
  <div class="email-footer"><p>© 2025 [Your Store]. All rights reserved.<br>{{company_address}}<br><a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{privacy_url}}">Privacy Policy</a></p></div>
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
      review_url: "https://cookie-bite.com/review/10042",
      company_address: "Cookie Bite Bakery, Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...reviewRequestTemplate.meta.sampleVars, ...vars };
    return {
      key: reviewRequestTemplate.meta.key,
      subject: `How was your ${merged.product_name}? Rate it in 30 seconds`,
      preheader: "Tap a star and help future customers.",
      html: buildEmail(REVIEW_REQUEST_BODY, merged, {
        title: "Leave a review",
        preheader: "Tap a star and help future customers.",
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
