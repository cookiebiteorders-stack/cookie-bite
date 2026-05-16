import { applyVars, renderShell } from "../shell";
import type { TemplateBuilder } from "../types";

const WELCOME_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag">New Member</span>
    <h1>Welcome aboard, {{first_name}}!</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>Thank you for creating an account with <strong>[Your Store]</strong>. We're thrilled to have you as part of our community.</p>
    <p>Your account is now ready. Start browsing our latest collections and enjoy a seamless shopping experience.</p>
    <div style="text-align:center;margin:24px 0;"><a class="cta-btn" href="{{shop_url}}">Start Shopping</a></div>
    <div class="info-box"><p>🎁 <strong>Welcome Offer:</strong> Use code <strong>{{welcome_code}}</strong> for {{welcome_discount}}% off your first order. Valid for {{welcome_validity_days}} days.</p></div>
    <hr class="divider">
    <p style="font-size:13px;color:#888;">Need help? Reply to this email or visit our <a href="{{help_url}}" style="color:#1a1a2e;">Help Center</a>.</p>
  </div>
  <div class="email-footer"><p>© 2025 [Your Store]. All rights reserved.<br>{{company_address}}<br><a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{privacy_url}}">Privacy Policy</a></p></div>
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
      shop_url: "https://cookie-bite.com",
      welcome_code: "WELCOME10",
      welcome_discount: 10,
      welcome_validity_days: 30,
      help_url: "https://cookie-bite.com/help",
      company_address: "Cookie Bite Bakery, Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...welcomeTemplate.meta.sampleVars, ...vars };
    return {
      key: welcomeTemplate.meta.key,
      subject: `Welcome to Cookie Bite, ${merged.first_name ?? "there"}!`,
      preheader: "Your account is ready. Start shopping with a welcome gift.",
      html: renderShell(applyVars(WELCOME_BODY, merged), {
        title: "Welcome",
        preheader: "Your account is ready. Start shopping with a welcome gift.",
        variant: "email",
        lang: options?.lang,
      }),
    };
  },
};

const ORDER_CONFIRMATION_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag">Order Confirmed</span>
    <h1>Thank you for your order!</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>We've received your order <strong>#{{order_number}}</strong> and it's being processed. Here's a summary:</p>
    <table class="order-table">
      <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
      <tbody>
        {{items_rows}}
        <tr class="total-row"><td colspan="2">Total</td><td>{{total_amount}}</td></tr>
      </tbody>
    </table>
    <div class="two-col">
      <div class="col-box"><h4>Shipping to</h4><p>{{customer_name}}<br>{{shipping_address}}</p></div>
      <div class="col-box"><h4>Payment</h4><p>{{payment_method}}<br>Paid: {{total_amount}}</p></div>
    </div>
    <div style="text-align:center;margin:20px 0;"><a class="cta-btn" href="{{order_url}}">View My Order</a></div>
  </div>
  <div class="email-footer"><p>© 2025 [Your Store]. All rights reserved.<br>{{company_address}}<br><a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{privacy_url}}">Privacy Policy</a></p></div>
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
        "<tr><td>Classic Cookie Box (12)</td><td>1</td><td>320.00 EGP</td></tr>" +
        "<tr><td>Chocolate Chunk Box (6)</td><td>2</td><td>360.00 EGP</td></tr>",
      total_amount: "680.00 EGP",
      customer_name: "Sara Ahmed",
      shipping_address: "12 Tahrir St, Cairo, Egypt",
      payment_method: "Credit Card · Visa •••• 4242",
      order_url: "https://cookie-bite.com/account",
      company_address: "Cookie Bite Bakery, Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...orderConfirmedTemplate.meta.sampleVars, ...vars };
    return {
      key: orderConfirmedTemplate.meta.key,
      subject: `Order confirmed — #${merged.order_number}`,
      preheader: `Thanks ${merged.first_name ?? ""}, we've received your order.`,
      html: renderShellSafe(ORDER_CONFIRMATION_BODY, merged, {
        title: "Order confirmed",
        preheader: `Thanks ${merged.first_name ?? ""}, we've received your order.`,
        lang: options?.lang,
      }),
    };
  },
};

const ORDER_SHIPPED_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag info">Shipped</span>
    <h1>Your order is on its way!</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>Great news! Your order <strong>#{{order_number}}</strong> has been shipped and is heading to you.</p>
    <div class="tracking-box">
      <p style="font-size:12px;color:#888;margin-bottom:6px;">TRACKING NUMBER</p>
      <div class="tracking-num">{{tracking_number}}</div>
      <p>via {{carrier_name}} · Est. delivery: {{estimated_delivery}}</p>
    </div>
    <div style="text-align:center;margin:20px 0;"><a class="cta-btn" href="{{tracking_url}}">Track My Package</a></div>
    <hr class="divider">
    <p style="font-size:13px;color:#888;">Didn't order this? Please <a href="{{contact_url}}" style="color:#1a1a2e;">contact us</a> immediately.</p>
  </div>
  <div class="email-footer"><p>© 2025 [Your Store]. All rights reserved.<br>{{company_address}}<br><a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{privacy_url}}">Privacy Policy</a></p></div>
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
      company_address: "Cookie Bite Bakery, Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...orderShippedTemplate.meta.sampleVars, ...vars };
    return {
      key: orderShippedTemplate.meta.key,
      subject: `Your order #${merged.order_number} is on its way!`,
      preheader: `Tracking ${merged.tracking_number} · ${merged.carrier_name}`,
      html: renderShellSafe(ORDER_SHIPPED_BODY, merged, {
        title: "Order shipped",
        preheader: `Tracking ${merged.tracking_number} · ${merged.carrier_name}`,
        lang: options?.lang,
      }),
    };
  },
};

const ORDER_DELIVERED_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag">Delivered</span>
    <h1>Your order has arrived!</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>Your order <strong>#{{order_number}}</strong> was delivered on <strong>{{delivery_date}}</strong>. We hope everything arrived in perfect condition.</p>
    <div class="info-box"><p><strong>Delivered to:</strong> {{shipping_address}}</p></div>
    <p>If there's anything wrong with your order, we're here to help. You have <strong>{{return_window}} days</strong> to return any items.</p>
    <div style="text-align:center;margin:20px 0;"><a class="cta-btn" href="{{order_url}}">View My Order</a></div>
    <hr class="divider">
    <p style="font-size:13px;color:#888;">Questions? <a href="{{support_url}}" style="color:#1a1a2e;">Contact our support team</a>.</p>
  </div>
  <div class="email-footer"><p>© 2025 [Your Store]. All rights reserved.<br>{{company_address}}<br><a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{privacy_url}}">Privacy Policy</a></p></div>
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
      shipping_address: "12 Tahrir St, Cairo, Egypt",
      return_window: 14,
      order_url: "https://cookie-bite.com/account",
      support_url: "https://cookie-bite.com/contact",
      company_address: "Cookie Bite Bakery, Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...orderDeliveredTemplate.meta.sampleVars, ...vars };
    return {
      key: orderDeliveredTemplate.meta.key,
      subject: `Your order #${merged.order_number} has arrived`,
      preheader: `Delivered ${merged.delivery_date}`,
      html: renderShellSafe(ORDER_DELIVERED_BODY, merged, {
        title: "Order delivered",
        preheader: `Delivered ${merged.delivery_date}`,
        lang: options?.lang,
      }),
    };
  },
};

const REFUND_BODY = `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">YOUR STORE</div></div>
  <div class="email-body">
    <span class="tag info">Refund Processed</span>
    <h1>Your refund is on its way</h1>
    <p class="greeting">Hi {{first_name}},</p>
    <p>We've successfully processed your refund for order <strong>#{{order_number}}</strong>. Here are the details:</p>
    <div class="two-col">
      <div class="col-box"><h4>Refund Amount</h4><p><strong>{{refund_amount}}</strong></p></div>
      <div class="col-box"><h4>Refunded To</h4><p>{{payment_method}}</p></div>
    </div>
    <div class="info-box"><p>⏳ Please allow <strong>{{processing_days}} business days</strong> for the refund to appear in your account, depending on your bank.</p></div>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div class="step-content"><h4>Refund initiated</h4><p>We've sent the refund from our end on {{refund_date}}.</p></div></div>
      <div class="step"><div class="step-num">2</div><div class="step-content"><h4>Processing</h4><p>Your bank or payment provider processes the amount.</p></div></div>
      <div class="step"><div class="step-num">3</div><div class="step-content"><h4>Received</h4><p>Funds arrive in your account within {{processing_days}} days.</p></div></div>
    </div>
    <div style="text-align:center;"><a class="cta-btn" href="{{order_url}}">View Refund Details</a></div>
  </div>
  <div class="email-footer"><p>© 2025 [Your Store]. All rights reserved.<br>{{company_address}}<br><a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{privacy_url}}">Privacy Policy</a></p></div>
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
      company_address: "Cookie Bite Bakery, Cairo, Egypt",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...refundConfirmedTemplate.meta.sampleVars, ...vars };
    return {
      key: refundConfirmedTemplate.meta.key,
      subject: `Refund processed for order #${merged.order_number}`,
      preheader: `${merged.refund_amount} refunded to ${merged.payment_method}`,
      html: renderShellSafe(REFUND_BODY, merged, {
        title: "Refund processed",
        preheader: `${merged.refund_amount} refunded`,
        lang: options?.lang,
      }),
    };
  },
};

function renderShellSafe(
  body: string,
  vars: Record<string, string | number | undefined | null>,
  options: { title: string; preheader?: string; lang?: "en" | "ar" },
): string {
  return renderShell(applyVars(body, vars), {
    title: options.title,
    preheader: options.preheader,
    variant: "email",
    lang: options.lang,
  });
}

export const TRANSACTIONAL_TEMPLATES: TemplateBuilder[] = [
  welcomeTemplate,
  orderConfirmedTemplate,
  orderShippedTemplate,
  orderDeliveredTemplate,
  refundConfirmedTemplate,
];
