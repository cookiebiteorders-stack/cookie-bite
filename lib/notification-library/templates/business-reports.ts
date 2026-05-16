import { applyVars, renderShell } from "../shell";
import type { TemplateBuilder } from "../types";

function buildReport(
  body: string,
  vars: Record<string, string | number | undefined | null>,
  opts: { title: string; lang?: "en" | "ar" },
): string {
  return renderShell(applyVars(body, vars), {
    title: opts.title,
    variant: "report",
    lang: opts.lang,
  });
}

const MONTHLY_SALES_BODY = `
<div class="doc-wrap">
  <div class="doc-head">
    <div class="store">YOUR STORE</div>
    <div class="rtype">Business Report</div>
    <div class="rtitle">Monthly Sales Report</div>
  </div>
  <div class="doc-meta">
    <div class="doc-meta-item"><div class="lbl">Period</div><div class="val">{{month_year}}</div></div>
    <div class="doc-meta-item"><div class="lbl">Prepared by</div><div class="val">{{author_name}}</div></div>
    <div class="doc-meta-item"><div class="lbl">Date issued</div><div class="val">{{issue_date}}</div></div>
  </div>
  <div class="doc-body">
    <h2>Key performance indicators</h2>
    <div class="kpi-row">
      <div class="kpi"><div class="k-lbl">Total Revenue</div><div class="k-val">{{total_revenue}}</div><div class="k-chg up">+{{revenue_growth}}% vs last month</div></div>
      <div class="kpi"><div class="k-lbl">Orders</div><div class="k-val">{{total_orders}}</div><div class="k-chg up">+{{order_growth}}% vs last month</div></div>
      <div class="kpi"><div class="k-lbl">Avg Order Value</div><div class="k-val">{{avg_order_value}}</div><div class="k-chg dn">{{aov_change}}% vs last month</div></div>
    </div>
    <div class="kpi-row">
      <div class="kpi"><div class="k-lbl">Conversion Rate</div><div class="k-val">{{conversion_rate}}%</div><div class="k-chg up">+{{conv_change}}%</div></div>
      <div class="kpi"><div class="k-lbl">New Customers</div><div class="k-val">{{new_customers}}</div><div class="k-chg up">+{{cust_growth}}%</div></div>
      <div class="kpi"><div class="k-lbl">Refund Rate</div><div class="k-val">{{refund_rate}}%</div><div class="k-chg g">Healthy</div></div>
    </div>
    <h2>Top products by revenue</h2>
    <table class="doc-table">
      <thead><tr><th>Product</th><th>Units Sold</th><th>Revenue</th><th>Status</th></tr></thead>
      <tbody>
        {{top_products_rows}}
        <tr class="tot"><td>Total</td><td>{{total_units}}</td><td>{{total_product_revenue}}</td><td></td></tr>
      </tbody>
    </table>
    <h2>Revenue by channel</h2>
    <div class="chart-bar-wrap">
      <div class="bar-row"><span class="lbl">Website</span><div class="bar-track"><div class="bar-fill" style="width:78%"></div></div><span class="bval">{{ch_web}}</span></div>
      <div class="bar-row"><span class="lbl">Mobile App</span><div class="bar-track"><div class="bar-fill" style="width:52%"></div></div><span class="bval">{{ch_app}}</span></div>
      <div class="bar-row"><span class="lbl">Marketplace</span><div class="bar-track"><div class="bar-fill" style="width:30%"></div></div><span class="bval">{{ch_market}}</span></div>
      <div class="bar-row"><span class="lbl">Social</span><div class="bar-track"><div class="bar-fill" style="width:18%"></div></div><span class="bval">{{ch_social}}</span></div>
    </div>
    <hr class="divider">
    <h2>Notes &amp; observations</h2>
    <div class="note-box"><p>{{report_notes}}</p></div>
  </div>
  <div class="doc-footer"><p>Confidential · [Your Store] · {{month_year}}</p><p>Page 1 of 1</p></div>
</div>
`;

export const monthlySalesReportTemplate: TemplateBuilder = {
  meta: {
    key: "doc-monthly-sales",
    name: "Monthly Sales Report",
    description: "Printable monthly sales executive summary.",
    category: "business-report",
    variant: "report",
    sampleVars: {
      month_year: "May 2026",
      author_name: "Finance Team",
      issue_date: "16 May 2026",
      total_revenue: "248,420 EGP",
      revenue_growth: 18,
      total_orders: 642,
      order_growth: 12,
      avg_order_value: "386.95 EGP",
      aov_change: -2,
      conversion_rate: 3.2,
      conv_change: 0.4,
      new_customers: 168,
      cust_growth: 24,
      refund_rate: 1.8,
      top_products_rows:
        '<tr><td>Classic Cookie Box (12)</td><td>284</td><td>90,880 EGP</td><td><span class="badge g">Top seller</span></td></tr>' +
        '<tr><td>Chocolate Chunk Box (6)</td><td>192</td><td>34,560 EGP</td><td><span class="badge b">Growing</span></td></tr>' +
        '<tr><td>Vanilla Cookie Box (24)</td><td>118</td><td>49,560 EGP</td><td><span class="badge y">Stable</span></td></tr>' +
        '<tr><td>Mini Bites (30)</td><td>48</td><td>14,400 EGP</td><td><span class="badge r">Declining</span></td></tr>',
      total_units: 642,
      total_product_revenue: "189,400 EGP",
      ch_web: "152,400 EGP",
      ch_app: "62,140 EGP",
      ch_market: "23,400 EGP",
      ch_social: "10,480 EGP",
      report_notes:
        "Strong revenue growth driven by the Spring Sale campaign. Mini Bites are underperforming — consider repositioning or bundling. Mobile app conversion increased after the May UX update.",
    },
  },
  build(vars, options) {
    const merged = { ...monthlySalesReportTemplate.meta.sampleVars, ...vars };
    return {
      key: monthlySalesReportTemplate.meta.key,
      subject: `Monthly Sales Report — ${merged.month_year}`,
      html: buildReport(MONTHLY_SALES_BODY, merged, {
        title: `Monthly Sales · ${merged.month_year}`,
        lang: options?.lang,
      }),
    };
  },
};

const CUSTOMER_ANALYTICS_BODY = `
<div class="doc-wrap">
  <div class="doc-head">
    <div class="store">YOUR STORE</div>
    <div class="rtype">Analytics Report</div>
    <div class="rtitle">Customer Analytics Report</div>
  </div>
  <div class="doc-meta">
    <div class="doc-meta-item"><div class="lbl">Period</div><div class="val">{{period}}</div></div>
    <div class="doc-meta-item"><div class="lbl">Segment</div><div class="val">{{customer_segment}}</div></div>
    <div class="doc-meta-item"><div class="lbl">Issued</div><div class="val">{{issue_date}}</div></div>
  </div>
  <div class="doc-body">
    <h2>Customer overview</h2>
    <div class="kpi-row">
      <div class="kpi"><div class="k-lbl">Total Customers</div><div class="k-val">{{total_customers}}</div><div class="k-chg up">+{{cust_growth}}% growth</div></div>
      <div class="kpi"><div class="k-lbl">Repeat Buyers</div><div class="k-val">{{repeat_buyers}}%</div><div class="k-chg up">+{{repeat_growth}}%</div></div>
      <div class="kpi"><div class="k-lbl">Customer LTV</div><div class="k-val">{{avg_ltv}}</div><div class="k-chg up">+{{ltv_growth}}%</div></div>
    </div>
    <div class="kpi-row">
      <div class="kpi"><div class="k-lbl">Churn Rate</div><div class="k-val">{{churn_rate}}%</div><div class="k-chg g">Below target</div></div>
      <div class="kpi"><div class="k-lbl">NPS Score</div><div class="k-val">{{nps_score}}</div><div class="k-chg up">+{{nps_change}} pts</div></div>
      <div class="kpi"><div class="k-lbl">Support Tickets</div><div class="k-val">{{support_tickets}}</div><div class="k-chg dn">+{{ticket_change}}%</div></div>
    </div>
    <h2>Top customer segments</h2>
    <div class="chart-bar-wrap">
      <div class="bar-row"><span class="lbl">VIP</span><div class="bar-track"><div class="bar-fill" style="width:85%"></div></div><span class="bval">{{seg_vip}}</span></div>
      <div class="bar-row"><span class="lbl">Loyal</span><div class="bar-track"><div class="bar-fill" style="width:65%"></div></div><span class="bval">{{seg_loyal}}</span></div>
      <div class="bar-row"><span class="lbl">New</span><div class="bar-track"><div class="bar-fill" style="width:48%"></div></div><span class="bval">{{seg_new}}</span></div>
      <div class="bar-row"><span class="lbl">At Risk</span><div class="bar-track"><div class="bar-fill" style="width:22%"></div></div><span class="bval">{{seg_at_risk}}</span></div>
    </div>
    <h2>Top customers by revenue</h2>
    <table class="doc-table">
      <thead><tr><th>Customer</th><th>Orders</th><th>Total Spend</th><th>Segment</th></tr></thead>
      <tbody>
        {{top_customers_rows}}
      </tbody>
    </table>
    <div class="note-box"><p>{{analytics_notes}}</p></div>
  </div>
  <div class="doc-footer"><p>Confidential · [Your Store] · {{period}}</p><p>Page 1 of 1</p></div>
</div>
`;

export const customerAnalyticsReportTemplate: TemplateBuilder = {
  meta: {
    key: "doc-customer-analytics",
    name: "Customer Analytics Report",
    description: "Quarterly customer health and segmentation breakdown.",
    category: "business-report",
    variant: "report",
    sampleVars: {
      period: "Q2 2026",
      customer_segment: "All segments",
      issue_date: "16 May 2026",
      total_customers: 2840,
      cust_growth: 14,
      repeat_buyers: 38,
      repeat_growth: 6,
      avg_ltv: "1,640 EGP",
      ltv_growth: 11,
      churn_rate: 2.4,
      nps_score: 58,
      nps_change: 4,
      support_tickets: 142,
      ticket_change: 9,
      seg_vip: "186",
      seg_loyal: "542",
      seg_new: "1,124",
      seg_at_risk: "284",
      top_customers_rows:
        '<tr><td>Sara Ahmed</td><td>24</td><td>9,840 EGP</td><td><span class="badge b">VIP</span></td></tr>' +
        '<tr><td>Omar Khaled</td><td>18</td><td>7,260 EGP</td><td><span class="badge b">VIP</span></td></tr>' +
        '<tr><td>Layla Mostafa</td><td>14</td><td>4,920 EGP</td><td><span class="badge g">Loyal</span></td></tr>',
      analytics_notes:
        "Customer base grew 14% with a healthy NPS rise (+4 pts). At-risk segment requires re-engagement — consider an automated win-back flow for customers inactive over 60 days.",
    },
  },
  build(vars, options) {
    const merged = { ...customerAnalyticsReportTemplate.meta.sampleVars, ...vars };
    return {
      key: customerAnalyticsReportTemplate.meta.key,
      subject: `Customer Analytics — ${merged.period}`,
      html: buildReport(CUSTOMER_ANALYTICS_BODY, merged, {
        title: `Customer Analytics · ${merged.period}`,
        lang: options?.lang,
      }),
    };
  },
};

const INVENTORY_STATUS_BODY = `
<div class="doc-wrap">
  <div class="doc-head">
    <div class="store">YOUR STORE</div>
    <div class="rtype">Operations Report</div>
    <div class="rtitle">Inventory Status Report</div>
  </div>
  <div class="doc-meta">
    <div class="doc-meta-item"><div class="lbl">Period</div><div class="val">{{report_date}}</div></div>
    <div class="doc-meta-item"><div class="lbl">Warehouse</div><div class="val">{{warehouse_name}}</div></div>
    <div class="doc-meta-item"><div class="lbl">Prepared by</div><div class="val">{{author_name}}</div></div>
  </div>
  <div class="doc-body">
    <h2>Stock overview</h2>
    <div class="kpi-row">
      <div class="kpi"><div class="k-lbl">Total SKUs</div><div class="k-val">{{total_skus}}</div><div class="k-chg up">In catalog</div></div>
      <div class="kpi"><div class="k-lbl">In Stock</div><div class="k-val">{{in_stock}}</div><div class="k-chg up">{{stock_pct}}% healthy</div></div>
      <div class="kpi"><div class="k-lbl">Low Stock</div><div class="k-val">{{low_stock}}</div><div class="k-chg dn">Needs reorder</div></div>
    </div>
    <h2>Stock status by category</h2>
    <table class="doc-table">
      <thead><tr><th>Category</th><th>SKUs</th><th>Units</th><th>Value</th><th>Status</th></tr></thead>
      <tbody>
        {{category_rows}}
        <tr class="tot"><td>Total</td><td>{{total_skus}}</td><td>{{total_units}}</td><td>{{total_value}}</td><td></td></tr>
      </tbody>
    </table>
    <h2>Items requiring immediate reorder</h2>
    <table class="doc-table">
      <thead><tr><th>Product</th><th>SKU</th><th>Current Stock</th><th>Reorder Qty</th></tr></thead>
      <tbody>
        {{reorder_rows}}
      </tbody>
    </table>
    <div class="note-box"><p>{{inventory_notes}}</p></div>
  </div>
  <div class="doc-footer"><p>Confidential · [Your Store] · {{report_date}}</p><p>Page 1 of 1</p></div>
</div>
`;

export const inventoryStatusReportTemplate: TemplateBuilder = {
  meta: {
    key: "doc-inventory-status",
    name: "Inventory Status Report",
    description: "Stock health snapshot with reorder shortlist.",
    category: "business-report",
    variant: "report",
    sampleVars: {
      report_date: "16 May 2026",
      warehouse_name: "Cairo Central",
      author_name: "Operations",
      total_skus: 142,
      in_stock: 118,
      stock_pct: 83,
      low_stock: 18,
      category_rows:
        '<tr><td>Cookie Boxes</td><td>42</td><td>1,840</td><td>184,000 EGP</td><td><span class="badge g">Healthy</span></td></tr>' +
        '<tr><td>Mini Bites</td><td>18</td><td>420</td><td>42,000 EGP</td><td><span class="badge y">Low</span></td></tr>' +
        '<tr><td>Gift Hampers</td><td>14</td><td>62</td><td>31,000 EGP</td><td><span class="badge r">Critical</span></td></tr>' +
        '<tr><td>Packaging</td><td>68</td><td>4,820</td><td>96,400 EGP</td><td><span class="badge g">Healthy</span></td></tr>',
      total_units: "7,142",
      total_value: "353,400 EGP",
      reorder_rows:
        '<tr><td>Chocolate Chunk Box (6)</td><td>SKU-CCB-06</td><td style="color:#c62828;font-weight:700;">3</td><td>120</td></tr>' +
        '<tr><td>Vanilla Cookie Box (24)</td><td>SKU-VCB-24</td><td style="color:#c62828;font-weight:700;">12</td><td>60</td></tr>' +
        '<tr><td>Classic Cookie Box (12)</td><td>SKU-CCB-12</td><td style="color:#f57c00;font-weight:700;">18</td><td>80</td></tr>',
      inventory_notes:
        "Gift Hampers category is critical — schedule a reorder with the supplier ASAP. Packaging stocks are healthy ahead of the upcoming Eid spike.",
    },
  },
  build(vars, options) {
    const merged = { ...inventoryStatusReportTemplate.meta.sampleVars, ...vars };
    return {
      key: inventoryStatusReportTemplate.meta.key,
      subject: `Inventory Status — ${merged.report_date}`,
      html: buildReport(INVENTORY_STATUS_BODY, merged, {
        title: `Inventory Status · ${merged.report_date}`,
        lang: options?.lang,
      }),
    };
  },
};

const PL_BODY = `
<div class="dw">
  <div class="dh">
    <div class="store">YOUR STORE</div>
    <div class="rtype">Financial Report</div>
    <div class="rtitle">Profit &amp; Loss Statement</div>
  </div>
  <div class="dmeta">
    <div class="dmi"><div class="ml">Period</div><div class="mv">{{period}}</div></div>
    <div class="dmi"><div class="ml">Currency</div><div class="mv">{{currency}}</div></div>
    <div class="dmi"><div class="ml">Issued</div><div class="mv">{{issue_date}}</div></div>
  </div>
  <div class="db">
    <div class="kpi3">
      <div class="k"><div class="kl">Gross Revenue</div><div class="kv">{{gross_revenue}}</div><div class="kc up">+{{rev_g}}% YoY</div></div>
      <div class="k"><div class="kl">Net Profit</div><div class="kv">{{net_profit}}</div><div class="kc up">+{{profit_g}}%</div></div>
      <div class="k"><div class="kl">Profit Margin</div><div class="kv">{{margin}}%</div><div class="kc n">Target: {{target_margin}}%</div></div>
    </div>
    <h2>Revenue breakdown</h2>
    <table class="dtbl">
      <thead><tr><th>Source</th><th>Amount</th><th>% of Total</th></tr></thead>
      <tbody>
        <tr><td>Product Sales</td><td>{{rev_products}}</td><td>{{pct_products}}%</td></tr>
        <tr><td>Shipping Fees</td><td>{{rev_shipping}}</td><td>{{pct_shipping}}%</td></tr>
        <tr><td>Promotions / Discounts</td><td style="color:#c62828;">-{{discounts}}</td><td>{{pct_discounts}}%</td></tr>
        <tr class="tot"><td>Net Revenue</td><td>{{net_revenue}}</td><td>100%</td></tr>
      </tbody>
    </table>
    <h2>Cost of goods sold (COGS)</h2>
    <table class="dtbl">
      <thead><tr><th>Item</th><th>Amount</th></tr></thead>
      <tbody>
        <tr><td>Product Cost</td><td>{{cogs_product}}</td></tr>
        <tr><td>Packaging</td><td>{{cogs_packaging}}</td></tr>
        <tr><td>Fulfillment / Shipping</td><td>{{cogs_fulfillment}}</td></tr>
        <tr class="tot"><td>Total COGS</td><td>{{total_cogs}}</td></tr>
      </tbody>
    </table>
    <h2>Operating expenses</h2>
    <table class="dtbl">
      <thead><tr><th>Expense</th><th>Amount</th></tr></thead>
      <tbody>
        <tr><td>Marketing &amp; Ads</td><td>{{exp_marketing}}</td></tr>
        <tr><td>Platform &amp; Software</td><td>{{exp_software}}</td></tr>
        <tr><td>Staff / Freelancers</td><td>{{exp_staff}}</td></tr>
        <tr><td>Other</td><td>{{exp_other}}</td></tr>
        <tr class="tot"><td>Total OpEx</td><td>{{total_opex}}</td></tr>
      </tbody>
    </table>
    <hr class="divider">
    <div class="kpi2">
      <div class="k"><div class="kl">Gross Profit</div><div class="kv">{{gross_profit}}</div></div>
      <div class="k"><div class="kl">Net Profit</div><div class="kv">{{net_profit}}</div></div>
    </div>
    <div class="note"><p>{{financial_notes}}</p></div>
  </div>
  <div class="df"><p>Confidential · [Your Store] · {{period}}</p><p>Page 1 of 1</p></div>
</div>
`;

export const profitLossReportTemplate: TemplateBuilder = {
  meta: {
    key: "doc-profit-loss",
    name: "Profit & Loss Statement",
    description: "Printable monthly P&L statement.",
    category: "business-report",
    variant: "report",
    sampleVars: {
      period: "May 2026",
      currency: "EGP",
      issue_date: "16 May 2026",
      gross_revenue: "248,420",
      rev_g: 18,
      net_profit: "62,140",
      profit_g: 22,
      margin: 25,
      target_margin: 28,
      rev_products: "236,200",
      pct_products: 95,
      rev_shipping: "12,220",
      pct_shipping: 5,
      discounts: "9,840",
      pct_discounts: -4,
      net_revenue: "238,580",
      cogs_product: "84,200",
      cogs_packaging: "12,400",
      cogs_fulfillment: "18,200",
      total_cogs: "114,800",
      exp_marketing: "23,400",
      exp_software: "6,200",
      exp_staff: "24,000",
      exp_other: "8,040",
      total_opex: "61,640",
      gross_profit: "123,780",
      financial_notes:
        "Strong revenue month. Marketing spend efficient (ROAS 4.2x). Net margin below target — consider negotiating better COGS terms on packaging.",
    },
  },
  build(vars, options) {
    const merged = { ...profitLossReportTemplate.meta.sampleVars, ...vars };
    return {
      key: profitLossReportTemplate.meta.key,
      subject: `Profit & Loss — ${merged.period}`,
      html: buildReport(PL_BODY, merged, {
        title: `P&L · ${merged.period}`,
        lang: options?.lang,
      }),
    };
  },
};

const RETURNS_REFUNDS_BODY = `
<div class="dw">
  <div class="dh">
    <div class="store">YOUR STORE</div>
    <div class="rtype">Operations Report</div>
    <div class="rtitle">Returns &amp; Refunds Report</div>
  </div>
  <div class="dmeta">
    <div class="dmi"><div class="ml">Period</div><div class="mv">{{period}}</div></div>
    <div class="dmi"><div class="ml">Issued</div><div class="mv">{{issue_date}}</div></div>
    <div class="dmi"><div class="ml">Prepared by</div><div class="mv">{{author}}</div></div>
  </div>
  <div class="db">
    <div class="kpi3">
      <div class="k"><div class="kl">Total Returns</div><div class="kv">{{total_returns}}</div><div class="kc dn">{{return_rate}}% rate</div></div>
      <div class="k"><div class="kl">Refund Value</div><div class="kv">{{total_refunds}}</div><div class="kc dn">of {{gross_revenue}}</div></div>
      <div class="k"><div class="kl">Avg Processing</div><div class="kv">{{avg_days}}d</div><div class="kc n">Target: {{target_days}}d</div></div>
    </div>
    <h2>Returns by reason</h2>
    <div class="bar-row"><span class="bl">Wrong size</span><div class="bar-track"><div class="bar-fill" style="width:65%"></div></div><span class="bv">{{r_size}}%</span></div>
    <div class="bar-row"><span class="bl">Defective</span><div class="bar-track"><div class="bar-fill" style="width:45%"></div></div><span class="bv">{{r_defect}}%</span></div>
    <div class="bar-row"><span class="bl">Not as described</span><div class="bar-track"><div class="bar-fill" style="width:30%"></div></div><span class="bv">{{r_desc}}%</span></div>
    <div class="bar-row"><span class="bl">Changed mind</span><div class="bar-track"><div class="bar-fill" style="width:20%"></div></div><span class="bv">{{r_mind}}%</span></div>
    <div class="bar-row"><span class="bl">Other</span><div class="bar-track"><div class="bar-fill" style="width:10%"></div></div><span class="bv">{{r_other}}%</span></div>
    <h2>Returns by category</h2>
    <table class="dtbl">
      <thead><tr><th>Category</th><th>Orders</th><th>Returns</th><th>Rate</th><th>Status</th></tr></thead>
      <tbody>
        {{returns_rows}}
      </tbody>
    </table>
    <div class="note"><p>{{returns_notes}}</p></div>
  </div>
  <div class="df"><p>Confidential · [Your Store] · {{period}}</p><p>Page 1 of 1</p></div>
</div>
`;

export const returnsRefundsReportTemplate: TemplateBuilder = {
  meta: {
    key: "doc-returns-refunds",
    name: "Returns & Refunds Report",
    description: "Monthly return-rate analysis with reason breakdown.",
    category: "business-report",
    variant: "report",
    sampleVars: {
      period: "May 2026",
      issue_date: "16 May 2026",
      author: "Operations",
      total_returns: 18,
      return_rate: 2.8,
      total_refunds: "6,420 EGP",
      gross_revenue: "248,420 EGP",
      avg_days: 3.4,
      target_days: 3,
      r_size: 35,
      r_defect: 24,
      r_desc: 18,
      r_mind: 14,
      r_other: 9,
      returns_rows:
        '<tr><td>Cookie Boxes</td><td>420</td><td>8</td><td>1.9%</td><td><span class="badge g">Healthy</span></td></tr>' +
        '<tr><td>Mini Bites</td><td>168</td><td>6</td><td>3.6%</td><td><span class="badge y">Monitor</span></td></tr>' +
        '<tr><td>Gift Hampers</td><td>54</td><td>3</td><td>5.6%</td><td><span class="badge r">High</span></td></tr>' +
        '<tr><td>Packaging</td><td>—</td><td>1</td><td>—</td><td><span class="badge g">Healthy</span></td></tr>',
      returns_notes:
        "Gift Hampers return rate is elevated — review packaging strength and product descriptions. Consider adding extra cushioning for fragile items.",
    },
  },
  build(vars, options) {
    const merged = { ...returnsRefundsReportTemplate.meta.sampleVars, ...vars };
    return {
      key: returnsRefundsReportTemplate.meta.key,
      subject: `Returns & Refunds — ${merged.period}`,
      html: buildReport(RETURNS_REFUNDS_BODY, merged, {
        title: `Returns · ${merged.period}`,
        lang: options?.lang,
      }),
    };
  },
};

export const BUSINESS_REPORT_TEMPLATES: TemplateBuilder[] = [
  monthlySalesReportTemplate,
  customerAnalyticsReportTemplate,
  inventoryStatusReportTemplate,
  profitLossReportTemplate,
  returnsRefundsReportTemplate,
];
