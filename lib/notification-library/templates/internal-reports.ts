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

const WEEKLY_SALES_BODY = `
<div class="email-wrap">
  <div class="email-head"><div class="store">YOUR STORE</div><div class="period">Weekly Report · {{week_range}}</div></div>
  <div class="email-body">
    <h1>Weekly sales summary</h1>
    <p>Hi {{manager_name}}, here's your performance snapshot for the week of <strong>{{week_range}}</strong>.</p>
    <div class="email-kpi">
      <div class="ek"><div class="el">Revenue</div><div class="ev">{{weekly_revenue}}</div><div class="ec up">+{{rev_growth}}% vs last week</div></div>
      <div class="ek"><div class="el">Orders</div><div class="ev">{{weekly_orders}}</div><div class="ec up">+{{ord_growth}}% vs last week</div></div>
      <div class="ek"><div class="el">New Customers</div><div class="ev">{{new_customers}}</div><div class="ec up">+{{cust_growth}}%</div></div>
      <div class="ek"><div class="el">Conversion Rate</div><div class="ev">{{conv_rate}}%</div><div class="ec dn">{{conv_change}}%</div></div>
    </div>
    <p style="font-size:12px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Top products this week</p>
    <table class="email-table">
      <thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead>
      <tbody>
        {{top_products_rows}}
      </tbody>
    </table>
    <a class="cta" href="{{report_url}}">View Full Report</a>
    <p style="font-size:11px;color:#aaa;margin-top:8px;">This is an automated weekly report sent every {{send_day}}.</p>
  </div>
  <div class="email-footer-b"><p>© 2025 [Your Store] · <a href="{{unsubscribe_url}}" style="color:#888;">Unsubscribe</a></p></div>
</div>
`;

export const weeklySalesTemplate: TemplateBuilder = {
  meta: {
    key: "report-weekly-sales",
    name: "Weekly Sales Summary",
    description: "Automated weekly performance digest for managers.",
    category: "internal-report",
    variant: "email",
    sampleVars: {
      manager_name: "Mostafa",
      week_range: "10 May – 16 May 2026",
      weekly_revenue: "62,140 EGP",
      rev_growth: 18,
      weekly_orders: 184,
      ord_growth: 12,
      new_customers: 47,
      cust_growth: 24,
      conv_rate: 3.2,
      conv_change: 0.4,
      top_products_rows:
        "<tr><td>Classic Cookie Box (12)</td><td>62</td><td>19,840 EGP</td></tr>" +
        "<tr><td>Chocolate Chunk Box (6)</td><td>54</td><td>9,720 EGP</td></tr>" +
        "<tr><td>Vanilla Cookie Box (24)</td><td>33</td><td>13,860 EGP</td></tr>",
      report_url: "https://cookie-bite.com/admin/reports",
      send_day: "Monday",
      unsubscribe_url: "#",
    },
  },
  build(vars, options) {
    const merged = { ...weeklySalesTemplate.meta.sampleVars, ...vars };
    return {
      key: weeklySalesTemplate.meta.key,
      subject: `Weekly sales summary · ${merged.week_range}`,
      preheader: `${merged.weekly_revenue} this week · ${merged.weekly_orders} orders`,
      html: buildEmail(WEEKLY_SALES_BODY, merged, {
        title: "Weekly sales summary",
        preheader: `${merged.weekly_revenue} this week`,
        lang: options?.lang,
      }),
    };
  },
};

const LOW_STOCK_BODY = `
<div class="email-wrap">
  <div class="email-head" style="background:#7d1a1a;"><div class="store">YOUR STORE</div><div class="period">Alert · {{alert_date}}</div></div>
  <div class="email-body">
    <h1 style="color:#7d1a1a;">Low stock alert</h1>
    <p>Hi {{manager_name}}, the following products are running critically low and require immediate action to avoid stockouts.</p>
    <table class="email-table">
      <thead><tr><th>Product</th><th>SKU</th><th>Current Stock</th><th>Daily Sales</th><th>Days Left</th></tr></thead>
      <tbody>
        {{low_stock_rows}}
      </tbody>
    </table>
    <div style="background:#fce4ec;border-left:3px solid #c62828;padding:10px 14px;border-radius:0 5px 5px 0;margin:14px 0;">
      <p style="font-size:12px;color:#7d1a1a;margin:0;line-height:1.6;">⚠️ <strong>Action required:</strong> Contact your supplier or update product availability on the storefront to prevent lost sales.</p>
    </div>
    <a class="cta" style="background:#7d1a1a;" href="{{inventory_url}}">Go to Inventory Panel</a>
  </div>
  <div class="email-footer-b"><p>© 2025 [Your Store] · Automated stock monitoring alert</p></div>
</div>
`;

export const lowStockAlertTemplate: TemplateBuilder = {
  meta: {
    key: "report-low-stock",
    name: "Low Stock Alert",
    description: "Real-time alert when products fall below reorder thresholds.",
    category: "internal-report",
    variant: "email",
    sampleVars: {
      manager_name: "Mostafa",
      alert_date: "16 May 2026",
      low_stock_rows:
        '<tr><td>Chocolate Chunk Box (6)</td><td>SKU-CCB-06</td><td style="color:#c62828;font-weight:700;">3</td><td>9</td><td style="color:#c62828;font-weight:700;">0.3</td></tr>' +
        '<tr><td>Vanilla Cookie Box (24)</td><td>SKU-VCB-24</td><td style="color:#f57c00;font-weight:700;">12</td><td>5</td><td style="color:#f57c00;font-weight:700;">2.4</td></tr>' +
        '<tr><td>Classic Cookie Box (12)</td><td>SKU-CCB-12</td><td style="color:#f57c00;font-weight:700;">18</td><td>7</td><td style="color:#f57c00;font-weight:700;">2.6</td></tr>',
      inventory_url: "https://cookie-bite.com/admin/products",
    },
  },
  build(vars, options) {
    const merged = { ...lowStockAlertTemplate.meta.sampleVars, ...vars };
    return {
      key: lowStockAlertTemplate.meta.key,
      subject: "⚠️ Low stock alert · Action required",
      preheader: `Critical stock levels detected on ${merged.alert_date}`,
      html: buildEmail(LOW_STOCK_BODY, merged, {
        title: "Low stock alert",
        preheader: "Critical stock levels detected",
        lang: options?.lang,
      }),
    };
  },
};

const ORDER_STATUS_REPORT_BODY = `
<div class="email-wrap">
  <div class="email-head"><div class="store">YOUR STORE</div><div class="period">Order Report · {{report_date}}</div></div>
  <div class="email-body">
    <h1>Your order status report</h1>
    <p>Hi {{customer_name}}, here's a full summary of your recent orders with [Your Store].</p>
    <table class="email-table">
      <thead><tr><th>Order #</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>
        {{order_rows}}
      </tbody>
    </table>
    <div class="email-kpi">
      <div class="ek"><div class="el">Total Orders</div><div class="ev">{{total_orders}}</div><div class="ec up">All time</div></div>
      <div class="ek"><div class="el">Total Spent</div><div class="ev">{{total_spent}}</div><div class="ec up">Since {{member_since}}</div></div>
    </div>
    <a class="cta" href="{{orders_url}}">View My Orders</a>
  </div>
  <div class="email-footer-b"><p>© 2025 [Your Store] · <a href="{{unsubscribe_url}}" style="color:#888;">Unsubscribe</a> · <a href="{{privacy_url}}" style="color:#888;">Privacy Policy</a></p></div>
</div>
`;

export const orderStatusReportTemplate: TemplateBuilder = {
  meta: {
    key: "report-order-status",
    name: "Order Status Report",
    description: "Customer-facing periodic summary of recent orders.",
    category: "internal-report",
    variant: "email",
    sampleVars: {
      customer_name: "Sara Ahmed",
      report_date: "16 May 2026",
      order_rows:
        '<tr><td>#10042</td><td>14 May</td><td>3</td><td>680.00 EGP</td><td><span class="badge g">Delivered</span></td></tr>' +
        '<tr><td>#10038</td><td>09 May</td><td>2</td><td>420.00 EGP</td><td><span class="badge b">In Transit</span></td></tr>' +
        '<tr><td>#10031</td><td>02 May</td><td>1</td><td>260.00 EGP</td><td><span class="badge y">Processing</span></td></tr>',
      total_orders: 12,
      total_spent: "5,840 EGP",
      member_since: "Jan 2025",
      orders_url: "https://cookie-bite.com/account",
      unsubscribe_url: "#",
      privacy_url: "https://cookie-bite.com/privacy",
    },
  },
  build(vars, options) {
    const merged = { ...orderStatusReportTemplate.meta.sampleVars, ...vars };
    return {
      key: orderStatusReportTemplate.meta.key,
      subject: "Your order status report",
      preheader: `${merged.total_orders} orders · ${merged.total_spent} all-time`,
      html: buildEmail(ORDER_STATUS_REPORT_BODY, merged, {
        title: "Your orders",
        preheader: `${merged.total_orders} orders · ${merged.total_spent}`,
        lang: options?.lang,
      }),
    };
  },
};

const CAMPAIGN_PERFORMANCE_BODY = `
<div class="ew">
  <div class="eh"><div class="logo">YOUR STORE</div><div class="period" style="color:rgba(255,255,255,0.7);font-size:11px;">Campaign Report · {{period}}</div></div>
  <div class="eb2">
    <h1>Campaign performance report</h1>
    <p>Hi {{manager_name}}, here's how your campaigns performed during <strong>{{period}}</strong>.</p>
    <div class="ekpi2">
      <div class="ek"><div class="el">Total Reach</div><div class="ev">{{total_reach}}</div><div class="ec up">+{{reach_g}}%</div></div>
      <div class="ek"><div class="el">Revenue Attributed</div><div class="ev">{{attributed_rev}}</div><div class="ec up">+{{rev_g}}%</div></div>
      <div class="ek"><div class="el">Blended ROAS</div><div class="ev">{{roas}}x</div><div class="ec up">Target: {{target_roas}}x</div></div>
      <div class="ek"><div class="el">Total Spend</div><div class="ev">{{total_spend}}</div><div class="ec n">Budget: {{budget}}</div></div>
    </div>
    <p style="font-size:11px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Campaign breakdown</p>
    <table class="etbl">
      <thead><tr><th>Campaign</th><th>Spend</th><th>Revenue</th><th>ROAS</th></tr></thead>
      <tbody>
        {{campaign_rows}}
      </tbody>
    </table>
    <a class="cta" href="{{report_url}}">View Full Report</a>
    <p style="font-size:11px;color:#aaa;margin-top:8px;">Automated report sent every {{send_day}}.</p>
  </div>
  <div class="ef2"><p>© 2025 [Your Store] · <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>
</div>
`;

export const campaignPerformanceTemplate: TemplateBuilder = {
  meta: {
    key: "report-campaign-performance",
    name: "Campaign Performance",
    description: "Channel-by-channel marketing campaign digest.",
    category: "internal-report",
    variant: "email",
    sampleVars: {
      manager_name: "Mostafa",
      period: "May 2026",
      total_reach: "184,302",
      reach_g: 22,
      attributed_rev: "98,420 EGP",
      rev_g: 31,
      roas: 4.2,
      target_roas: 3.5,
      total_spend: "23,400 EGP",
      budget: "25,000 EGP",
      campaign_rows:
        "<tr><td>Spring Sale (Meta)</td><td>9,200 EGP</td><td>42,180 EGP</td><td>4.6x</td></tr>" +
        "<tr><td>Restock (Google)</td><td>8,400 EGP</td><td>31,920 EGP</td><td>3.8x</td></tr>" +
        "<tr><td>Email blast (Weekly)</td><td>500 EGP</td><td>9,640 EGP</td><td>19.3x</td></tr>",
      report_url: "https://cookie-bite.com/admin/reports",
      send_day: "Monday",
      unsubscribe_url: "#",
    },
  },
  build(vars, options) {
    const merged = { ...campaignPerformanceTemplate.meta.sampleVars, ...vars };
    return {
      key: campaignPerformanceTemplate.meta.key,
      subject: `Campaign report · ${merged.period}`,
      preheader: `${merged.attributed_rev} revenue · ${merged.roas}x ROAS`,
      html: buildEmail(CAMPAIGN_PERFORMANCE_BODY, merged, {
        title: "Campaign performance",
        preheader: `${merged.attributed_rev} revenue`,
        lang: options?.lang,
      }),
    };
  },
};

const SUPPLIER_REORDER_BODY = `
<div class="ew">
  <div class="eh" style="background:#1a3a1a;"><div class="logo">YOUR STORE</div><div class="period" style="color:rgba(255,255,255,0.7);font-size:11px;">Reorder Report · {{report_date}}</div></div>
  <div class="eb2">
    <h1>Supplier reorder summary</h1>
    <p>Hi {{ops_manager}}, here are the items that need to be reordered based on current stock levels and sales velocity.</p>
    <div class="ekpi2">
      <div class="ek"><div class="el">Items to Reorder</div><div class="ev">{{total_items}}</div><div class="ec dn">Urgent</div></div>
      <div class="ek"><div class="el">Est. Reorder Cost</div><div class="ev">{{total_cost}}</div><div class="ec n">Across {{supplier_count}} suppliers</div></div>
    </div>
    <p style="font-size:11px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Items requiring reorder</p>
    <table class="etbl">
      <thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Reorder Qty</th><th>Supplier</th></tr></thead>
      <tbody>
        {{reorder_rows}}
      </tbody>
    </table>
    <a class="cta" style="background:#1a3a1a;" href="{{po_url}}">Open Purchase Orders</a>
  </div>
  <div class="ef2"><p>© 2025 [Your Store] · Automated reorder report · Sent {{send_frequency}}</p></div>
</div>
`;

export const supplierReorderTemplate: TemplateBuilder = {
  meta: {
    key: "report-supplier-reorder",
    name: "Supplier Reorder Summary",
    description: "Items requiring reorder grouped by supplier.",
    category: "internal-report",
    variant: "email",
    sampleVars: {
      ops_manager: "Mostafa",
      report_date: "16 May 2026",
      total_items: 8,
      total_cost: "34,200 EGP",
      supplier_count: 3,
      reorder_rows:
        '<tr><td>Chocolate Chunk Box (6)</td><td>SKU-CCB-06</td><td style="color:#c62828;font-weight:700;">3</td><td>120</td><td>Sweet Mills Co.</td></tr>' +
        '<tr><td>Vanilla Cookie Box (24)</td><td>SKU-VCB-24</td><td style="color:#c62828;font-weight:700;">12</td><td>60</td><td>Sweet Mills Co.</td></tr>' +
        '<tr><td>Classic Cookie Box (12)</td><td>SKU-CCB-12</td><td style="color:#f57c00;font-weight:700;">18</td><td>80</td><td>Cairo Packaging</td></tr>' +
        '<tr><td>Kraft Gift Box</td><td>SKU-KGB-01</td><td style="color:#f57c00;font-weight:700;">22</td><td>200</td><td>Cairo Packaging</td></tr>',
      po_url: "https://cookie-bite.com/admin/products",
      send_frequency: "weekly",
    },
  },
  build(vars, options) {
    const merged = { ...supplierReorderTemplate.meta.sampleVars, ...vars };
    return {
      key: supplierReorderTemplate.meta.key,
      subject: `Reorder summary · ${merged.total_items} items · ${merged.total_cost}`,
      preheader: `${merged.total_items} items across ${merged.supplier_count} suppliers`,
      html: buildEmail(SUPPLIER_REORDER_BODY, merged, {
        title: "Supplier reorder",
        preheader: `${merged.total_items} items to reorder`,
        lang: options?.lang,
      }),
    };
  },
};

export const INTERNAL_REPORT_TEMPLATES: TemplateBuilder[] = [
  weeklySalesTemplate,
  lowStockAlertTemplate,
  orderStatusReportTemplate,
  campaignPerformanceTemplate,
  supplierReorderTemplate,
];
