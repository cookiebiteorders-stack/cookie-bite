import type { InvoiceStatus, InvoiceViewModel } from "@/components/invoices/invoice-view";
import { INVOICE_PRINT_STYLES } from "@/lib/invoices/invoice-print-styles";

const STORE_DEFAULTS = {
  name: "Cookie Bite",
  address_lines: ["Fifth Settlement"],
  city: "New Cairo",
  country: "Egypt",
  email: "cookie-bite@cookie-bite.com",
  phone: "01140165995",
  tax_number: "—",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(amount: number, currency: string): string {
  const value = Number(amount || 0).toLocaleString("en-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${value}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadgeHtml(status: InvoiceStatus): string {
  if (status === "paid") {
    return '<span class="inv-status inv-status-paid">✓ Paid</span>';
  }
  if (status === "refunded") {
    return '<span class="inv-status inv-status-refunded">↺ Refunded</span>';
  }
  if (status === "failed") {
    return '<span class="inv-status inv-status-failed">! Failed</span>';
  }
  return '<span class="inv-status inv-status-pending">⏳ Awaiting Payment</span>';
}

/**
 * Full HTML document matching the on-screen invoice design (for PDF engine / print window).
 */
export function renderInvoicePrintHtml(vm: InvoiceViewModel): string {
  const currency = vm.currency ?? "EGP";
  const currencyFull = vm.currency_full ?? "Egyptian Pound";
  const store = { ...STORE_DEFAULTS, ...(vm.store ?? {}) };

  const subtotal = vm.subtotal_egp;
  const discount = vm.discount_amount_egp ?? 0;
  const tax = vm.tax_amount_egp ?? 0;
  const taxRate = vm.tax_rate ?? 0;
  const shipping = vm.shipping_amount_egp ?? 0;
  const total = vm.total_amount_egp;

  const storeAddress = (store.address_lines ?? [])
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");

  const customerAddress = (vm.customer_address_lines ?? [])
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");

  const itemRows =
    vm.items.length > 0
      ? vm.items
          .map((item) => {
            const lineTotal =
              item.total_price_egp ??
              Number(item.unit_price_egp || 0) * Number(item.quantity || 0);
            const sku =
              item.product_sku || item.product_variant
                ? `<span class="item-sku">${escapeHtml(
                    [item.product_sku, item.product_variant].filter(Boolean).join(" · "),
                  )}</span>`
                : "";
            return `<tr>
              <td><span class="item-name">${escapeHtml(item.product_name)}</span>${sku}</td>
              <td><span class="qty-pill">${item.quantity}</span></td>
              <td>${formatMoney(item.unit_price_egp, currency)}</td>
              <td>${formatMoney(lineTotal, currency)}</td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="4" style="text-align:center;color:#666">No line items</td></tr>`;

  const body = `
<div class="inv-root cb-print-document">
  <div class="inv-wrap">
    <div class="inv-header">
      <div class="inv-top">
        <div>
          <span class="brand-name">${escapeHtml(store.name ?? "Cookie Bite")}</span>
          <span class="brand-sub">Official Invoice</span>
        </div>
        <span class="inv-badge">Invoice</span>
      </div>
      <div class="inv-meta">
        <div class="inv-meta-item">
          <span class="inv-meta-label">Invoice No.</span>
          <span class="inv-meta-val accent">${escapeHtml(vm.invoice_number)}</span>
        </div>
        ${
          vm.order_number
            ? `<div class="inv-meta-item">
          <span class="inv-meta-label">Order Ref.</span>
          <span class="inv-meta-val">${escapeHtml(vm.order_number)}</span>
        </div>`
            : ""
        }
        <div class="inv-meta-item">
          <span class="inv-meta-label">Issue Date</span>
          <span class="inv-meta-val">${formatDate(vm.issued_at)}</span>
        </div>
        <div class="inv-meta-item">
          <span class="inv-meta-label">Due Date</span>
          <span class="inv-meta-val">${formatDate(vm.due_at ?? vm.issued_at)}</span>
        </div>
      </div>
    </div>
    <div class="inv-body">
      <div class="party-grid">
        <div>
          <span class="party-label">From</span>
          <div class="party-name">${escapeHtml(store.name ?? "Cookie Bite")}</div>
          <div class="party-detail">
            ${storeAddress}
            <div>${escapeHtml(store.city ?? "")}${store.city && store.country ? ", " : ""}${escapeHtml(store.country ?? "")}</div>
            ${store.email ? `<div>${escapeHtml(store.email)}</div>` : ""}
            ${store.phone ? `<div>${escapeHtml(store.phone)}</div>` : ""}
            ${store.tax_number ? `<div>Tax No: ${escapeHtml(store.tax_number)}</div>` : ""}
          </div>
        </div>
        <div>
          <span class="party-label">Billed To</span>
          <div class="party-name">${escapeHtml(vm.customer_name ?? "Guest customer")}</div>
          <div class="party-detail">
            ${customerAddress}
            ${vm.customer_email ? `<div>${escapeHtml(vm.customer_email)}</div>` : ""}
            ${vm.customer_phone ? `<div>${escapeHtml(vm.customer_phone)}</div>` : ""}
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="pay-status-row">
        <span class="section-label">Payment Status</span>
        ${statusBadgeHtml(vm.status)}
        ${
          vm.payment_method || vm.transaction_id
            ? `<span class="txn-info">${vm.payment_method ? `via ${escapeHtml(vm.payment_method)}` : ""}${vm.payment_method && vm.transaction_id ? " · " : ""}${vm.transaction_id ? `Txn: ${escapeHtml(vm.transaction_id)}` : ""}</span>`
            : ""
        }
      </div>
      <table class="items-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="totals-section">
        <div class="totals-box">
          <div class="totals-row"><span>Subtotal</span><span class="val">${formatMoney(subtotal, currency)}</span></div>
          ${
            discount > 0
              ? `<div class="totals-row discount"><span>Discount${vm.discount_code ? ` (${escapeHtml(vm.discount_code)})` : ""}</span><span class="val">− ${formatMoney(discount, currency)}</span></div>`
              : ""
          }
          ${
            tax > 0
              ? `<div class="totals-row"><span>Tax${taxRate ? ` (${taxRate}%)` : ""}</span><span class="val">${formatMoney(tax, currency)}</span></div>`
              : ""
          }
          ${
            shipping > 0
              ? `<div class="totals-row"><span>Shipping</span><span class="val">${formatMoney(shipping, currency)}</span></div>`
              : ""
          }
          <div class="totals-grand">
            <span class="label">Total Due</span>
            <span class="amount">${formatMoney(total, currency)}</span>
          </div>
        </div>
      </div>
      ${
        vm.notes
          ? `<div class="notes-block"><div class="notes-label">Notes</div><div class="notes-text">${escapeHtml(vm.notes)}</div></div>`
          : ""
      }
    </div>
    <div class="inv-footer">
      <div class="footer-note">This invoice was auto-generated by ${escapeHtml(store.name ?? "Cookie Bite")}. All prices are in ${escapeHtml(currencyFull)} (${escapeHtml(currency)}). Thank you for your business!</div>
    </div>
  </div>
</div>`;

  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light only">
<title>Invoice ${escapeHtml(vm.invoice_number)}</title>
<style>
${INVOICE_PRINT_STYLES}
@page { size: A4; margin: 10mm 12mm 14mm; }
*, *::before, *::after {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
body { margin: 0; padding: 16px; background: #f0ede6; }
@media print { body { padding: 0; background: #fff; } }
</style>
</head>
<body>
${body}
</body>
</html>`;
}
