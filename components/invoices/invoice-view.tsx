"use client";

import { useCallback, useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { downloadPdfFromUrl } from "@/lib/print/download-pdf";
import { printInvoiceElement } from "@/lib/print/print-document";
import { cn } from "@/lib/utils";

export type InvoiceItem = {
  id: string;
  product_name: string;
  product_sku?: string | null;
  product_variant?: string | null;
  quantity: number;
  unit_price_egp: number;
  total_price_egp?: number | null;
};

export type InvoiceStatus = "paid" | "pending" | "failed" | "refunded";

export type InvoiceViewModel = {
  invoice_number: string;
  order_number?: string | null;
  issued_at: string;
  due_at?: string | null;
  status: InvoiceStatus;

  customer_name: string | null;
  customer_email: string | null;
  customer_phone?: string | null;
  customer_address_lines?: string[];

  items: InvoiceItem[];

  subtotal_egp: number;
  discount_amount_egp?: number;
  discount_code?: string | null;
  tax_rate?: number;
  tax_amount_egp?: number;
  shipping_amount_egp?: number;
  total_amount_egp: number;

  payment_method?: string | null;
  transaction_id?: string | null;

  notes?: string | null;

  /** بيانات المتجر (تظهر في كتلة "From") — اختيارية مع قيم افتراضية */
  store?: {
    name?: string;
    address_lines?: string[];
    city?: string;
    country?: string;
    email?: string;
    phone?: string;
    tax_number?: string | null;
  };

  /** عملة العرض (افتراضي EGP) */
  currency?: string;
  currency_full?: string;

  /** عند true يخفي شريط الإجراءات (طباعة/تنزيل) — مفيد داخل الدرج */
  hideActions?: boolean;

  /** رابط التنزيل بصيغة PDF (اختياري) */
  downloadUrl?: string;
};

const STORE_DEFAULTS = {
  name: "Cookie Bite",
  address_lines: ["Fifth Settlement"],
  city: "New Cairo",
  country: "Egypt",
  email: "cookie-bite@cookie-bite.com",
  phone: "01140165995",
  tax_number: "—",
};

const CURRENCY_DEFAULTS = {
  currency: "EGP",
  currency_full: "Egyptian Pound",
};

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

function StatusBadge({ status }: { status: InvoiceStatus }) {
  if (status === "paid") {
    return (
      <span className="inv-status inv-status-paid">
        <span aria-hidden>✓</span>
        Paid
      </span>
    );
  }
  if (status === "refunded") {
    return (
      <span className="inv-status inv-status-refunded">
        <span aria-hidden>↺</span>
        Refunded
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inv-status inv-status-failed">
        <span aria-hidden>!</span>
        Failed
      </span>
    );
  }
  return (
    <span className="inv-status inv-status-pending">
      <span aria-hidden>⏳</span>
      Awaiting Payment
    </span>
  );
}

export function InvoiceView({
  invoice,
  className,
}: {
  invoice: InvoiceViewModel;
  className?: string;
}) {
  const currency = invoice.currency ?? CURRENCY_DEFAULTS.currency;
  const currencyFull = invoice.currency_full ?? CURRENCY_DEFAULTS.currency_full;

  const store = { ...STORE_DEFAULTS, ...(invoice.store ?? {}) };

  const subtotal = invoice.subtotal_egp;
  const discount = invoice.discount_amount_egp ?? 0;
  const tax = invoice.tax_amount_egp ?? 0;
  const taxRate = invoice.tax_rate ?? 0;
  const shipping = invoice.shipping_amount_egp ?? 0;
  const total = invoice.total_amount_egp;

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadPdf = useCallback(async () => {
    if (!invoice.downloadUrl) return;
    setDownloadingPdf(true);
    setDownloadError(null);
    try {
      const name = `${invoice.invoice_number.replace(/[^\w.-]+/g, "_")}.pdf`;
      await downloadPdfFromUrl(invoice.downloadUrl, name);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setDownloadingPdf(false);
    }
  }, [invoice.downloadUrl, invoice.invoice_number]);

  return (
    <div className={cn("inv-root cb-print-document", className)} dir="ltr" lang="en">
      <style jsx>{`
        .inv-root {
          --inv-orange: #c1692c;
          --inv-orange-dark: #a55623;
          --inv-dark-bg: #1a1a0e;
          --inv-white: #ffffff;
          --inv-text-primary: #1a1a1a;
          --inv-text-muted: #666666;
          --inv-border: rgba(0, 0, 0, 0.1);
          --inv-surface: #f7f6f3;
          --inv-green: #22a06b;
          --inv-green-bg: #e6f9f0;
          --inv-green-border: #b7edce;
          --inv-amber-bg: #fff4e6;
          --inv-amber: #b45309;
          --inv-amber-border: #fcd0a1;
          --inv-red-bg: #fdecec;
          --inv-red: #b91c1c;
          --inv-red-border: #f5b6b6;
          --inv-blue-bg: #e6f0ff;
          --inv-blue: #1e40af;
          --inv-blue-border: #b6cdf5;

          font-family: "DM Sans", var(--font-montserrat), ui-sans-serif,
            system-ui, sans-serif;
          color: var(--inv-text-primary);
        }

        .inv-wrap {
          background: var(--inv-white);
          border-radius: 16px;
          overflow: hidden;
          max-width: 760px;
          margin: 0 auto;
          box-shadow: 0 4px 32px rgba(0, 0, 0, 0.1);
        }

        .inv-header {
          background: var(--inv-dark-bg);
          padding: 40px 48px 32px;
          position: relative;
          overflow: hidden;
        }
        .inv-header::before {
          content: "";
          position: absolute;
          top: -70px;
          right: -70px;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          background: var(--inv-orange);
          opacity: 0.08;
        }
        .inv-header::after {
          content: "";
          position: absolute;
          bottom: -50px;
          left: 35%;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: var(--inv-orange);
          opacity: 0.05;
        }

        .inv-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
          z-index: 1;
        }

        .brand-name {
          font-family: "DM Serif Display", var(--font-playfair), serif;
          font-size: 28px;
          color: var(--inv-white);
          letter-spacing: -0.5px;
          display: block;
        }
        .brand-sub {
          font-size: 10px;
          color: var(--inv-orange);
          letter-spacing: 2.5px;
          text-transform: uppercase;
          font-weight: 600;
          margin-top: 4px;
          display: block;
        }

        .inv-badge {
          background: var(--inv-orange);
          color: var(--inv-white);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 7px 20px;
          border-radius: 6px;
        }

        .inv-meta {
          display: flex;
          gap: 48px;
          margin-top: 32px;
          position: relative;
          z-index: 1;
          flex-wrap: wrap;
        }
        .inv-meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .inv-meta-label {
          font-size: 9px;
          color: #888;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 600;
        }
        .inv-meta-val {
          font-size: 14px;
          color: var(--inv-white);
          font-weight: 500;
        }
        .inv-meta-val.accent {
          color: var(--inv-orange);
          font-weight: 700;
        }

        .inv-body {
          padding: 36px 48px;
        }

        .party-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          margin-bottom: 36px;
        }
        .party-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--inv-text-muted);
          margin-bottom: 8px;
          display: block;
        }
        .party-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--inv-text-primary);
          margin-bottom: 6px;
        }
        .party-detail {
          font-size: 13px;
          color: var(--inv-text-muted);
          line-height: 1.8;
        }

        .divider {
          height: 1px;
          background: var(--inv-border);
          margin: 0 0 28px;
        }

        .pay-status-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .section-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--inv-text-muted);
        }

        .inv-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 5px 14px;
          border-radius: 6px;
          border: 1px solid transparent;
        }
        .inv-status-paid {
          background: var(--inv-green-bg);
          color: var(--inv-green);
          border-color: var(--inv-green-border);
        }
        .inv-status-pending {
          background: var(--inv-amber-bg);
          color: var(--inv-amber);
          border-color: var(--inv-amber-border);
        }
        .inv-status-failed {
          background: var(--inv-red-bg);
          color: var(--inv-red);
          border-color: var(--inv-red-border);
        }
        .inv-status-refunded {
          background: var(--inv-blue-bg);
          color: var(--inv-blue);
          border-color: var(--inv-blue-border);
        }

        .txn-info {
          font-size: 12px;
          color: var(--inv-text-muted);
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 28px;
          table-layout: fixed;
        }
        .items-table thead tr {
          border-bottom: 1.5px solid var(--inv-border);
        }
        .items-table th {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--inv-text-muted);
          padding: 0 0 12px;
          text-align: left;
        }
        .items-table th:nth-child(2) {
          text-align: center;
          width: 10%;
        }
        .items-table th:nth-child(3) {
          text-align: right;
          width: 22%;
        }
        .items-table th:nth-child(4) {
          text-align: right;
          width: 22%;
        }
        .items-table th:first-child {
          width: 46%;
        }
        .items-table tbody tr {
          border-bottom: 1px solid var(--inv-border);
        }
        .items-table tbody tr:last-child {
          border-bottom: none;
        }
        .items-table td {
          padding: 16px 0;
          font-size: 13px;
          color: var(--inv-text-primary);
          vertical-align: middle;
        }
        .items-table td:nth-child(2) {
          text-align: center;
        }
        .items-table td:nth-child(3) {
          text-align: right;
          color: var(--inv-text-muted);
        }
        .items-table td:nth-child(4) {
          text-align: right;
          font-weight: 600;
        }

        .item-name {
          font-weight: 600;
          display: block;
          margin-bottom: 3px;
        }
        .item-sku {
          font-size: 11px;
          color: var(--inv-text-muted);
          display: block;
        }

        .qty-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 30px;
          height: 30px;
          padding: 0 8px;
          border-radius: 999px;
          background: var(--inv-surface);
          font-size: 13px;
          font-weight: 600;
          color: var(--inv-text-primary);
        }

        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 32px;
        }
        .totals-box {
          width: 320px;
          max-width: 100%;
        }

        .totals-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 9px 0;
          border-bottom: 1px solid var(--inv-border);
          font-size: 13px;
          color: var(--inv-text-muted);
        }
        .totals-row:last-of-type {
          border-bottom: none;
        }
        .totals-row .val {
          color: var(--inv-text-primary);
          font-weight: 600;
        }
        .totals-row.discount .val {
          color: var(--inv-green);
        }

        .totals-grand {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: var(--inv-dark-bg);
          border-radius: 10px;
          margin-top: 10px;
        }
        .totals-grand .label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #aaa;
        }
        .totals-grand .amount {
          font-family: "DM Serif Display", var(--font-playfair), serif;
          font-size: 24px;
          color: var(--inv-orange);
          letter-spacing: -0.5px;
        }

        .notes-block {
          background: var(--inv-surface);
          border-radius: 10px;
          padding: 16px 20px;
          margin-bottom: 8px;
        }
        .notes-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--inv-text-muted);
          margin-bottom: 6px;
        }
        .notes-text {
          font-size: 13px;
          color: var(--inv-text-muted);
          line-height: 1.7;
        }

        .inv-footer {
          padding: 24px 48px;
          border-top: 1px solid var(--inv-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .footer-note {
          font-size: 11px;
          color: var(--inv-text-muted);
          max-width: 380px;
          line-height: 1.7;
        }
        .footer-actions {
          display: flex;
          gap: 10px;
        }

        .inv-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid var(--inv-border);
          background: var(--inv-white);
          color: var(--inv-text-primary);
          font-family: inherit;
          text-decoration: none;
          transition: background 0.15s;
        }
        .inv-btn:hover {
          background: var(--inv-surface);
        }
        .inv-btn-primary {
          background: var(--inv-orange);
          color: var(--inv-white);
          border-color: var(--inv-orange);
        }
        .inv-btn-primary:hover {
          background: var(--inv-orange-dark);
        }

        @media (max-width: 600px) {
          .inv-body,
          .inv-header,
          .inv-footer {
            padding-left: 24px;
            padding-right: 24px;
          }
          .party-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .inv-meta {
            gap: 24px;
          }
          .totals-section {
            justify-content: flex-start;
          }
          .totals-box {
            width: 100%;
          }
          .inv-footer {
            flex-direction: column;
            align-items: flex-start;
          }
          .inv-header {
            padding: 28px 24px 24px;
          }
          .inv-body {
            padding: 24px;
          }
          .brand-name {
            font-size: 22px;
          }
          .totals-grand .amount {
            font-size: 20px;
          }
          .items-table th,
          .items-table td {
            font-size: 12px;
          }
        }

        @media print {
          .inv-no-print {
            display: none !important;
          }
          .inv-root {
            background: #fff !important;
          }
          .inv-wrap {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: none !important;
          }
          .inv-header {
            background: var(--inv-dark-bg) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .inv-badge,
          .totals-grand,
          .inv-status-paid,
          .inv-status-pending,
          .inv-status-failed,
          .inv-status-refunded {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .party-grid,
          .pay-status-row,
          .totals-grand,
          .items-table thead tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="inv-wrap">
        <div className="inv-header">
          <div className="inv-top">
            <div>
              <span className="brand-name">{store.name}</span>
              <span className="brand-sub">Official Invoice</span>
            </div>
            <span className="inv-badge">Invoice</span>
          </div>

          <div className="inv-meta">
            <div className="inv-meta-item">
              <span className="inv-meta-label">Invoice No.</span>
              <span className="inv-meta-val accent">
                {invoice.invoice_number}
              </span>
            </div>
            {invoice.order_number ? (
              <div className="inv-meta-item">
                <span className="inv-meta-label">Order Ref.</span>
                <span className="inv-meta-val">{invoice.order_number}</span>
              </div>
            ) : null}
            <div className="inv-meta-item">
              <span className="inv-meta-label">Issue Date</span>
              <span className="inv-meta-val">
                {formatDate(invoice.issued_at)}
              </span>
            </div>
            <div className="inv-meta-item">
              <span className="inv-meta-label">Due Date</span>
              <span className="inv-meta-val">
                {formatDate(invoice.due_at ?? invoice.issued_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="inv-body">
          <div className="party-grid">
            <div>
              <span className="party-label">From</span>
              <div className="party-name">{store.name}</div>
              <div className="party-detail">
                {(store.address_lines ?? []).map((line, i) => (
                  <div key={`a-${i}`}>{line}</div>
                ))}
                <div>
                  {store.city}
                  {store.city && store.country ? ", " : ""}
                  {store.country}
                </div>
                {store.email ? <div>{store.email}</div> : null}
                {store.phone ? <div>{store.phone}</div> : null}
                {store.tax_number ? (
                  <div>Tax No: {store.tax_number}</div>
                ) : null}
              </div>
            </div>
            <div>
              <span className="party-label">Billed To</span>
              <div className="party-name">
                {invoice.customer_name ?? "Guest customer"}
              </div>
              <div className="party-detail">
                {(invoice.customer_address_lines ?? []).map((line, i) => (
                  <div key={`c-${i}`}>{line}</div>
                ))}
                {invoice.customer_email ? (
                  <div>{invoice.customer_email}</div>
                ) : null}
                {invoice.customer_phone ? (
                  <div>{invoice.customer_phone}</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="divider" />

          <div className="pay-status-row">
            <span className="section-label">Payment Status</span>
            <StatusBadge status={invoice.status} />
            {invoice.payment_method || invoice.transaction_id ? (
              <span className="txn-info">
                {invoice.payment_method ? `via ${invoice.payment_method}` : ""}
                {invoice.payment_method && invoice.transaction_id
                  ? "  ·  "
                  : ""}
                {invoice.transaction_id
                  ? `Txn: ${invoice.transaction_id}`
                  : ""}
              </span>
            ) : null}
          </div>

          <table className="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.length ? (
                invoice.items.map((item) => {
                  const lineTotal =
                    item.total_price_egp ??
                    Number(item.unit_price_egp || 0) *
                      Number(item.quantity || 0);
                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="item-name">{item.product_name}</span>
                        {item.product_sku || item.product_variant ? (
                          <span className="item-sku">
                            {item.product_sku ?? ""}
                            {item.product_sku && item.product_variant
                              ? "  ·  "
                              : ""}
                            {item.product_variant ?? ""}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <span className="qty-pill">{item.quantity}</span>
                      </td>
                      <td>{formatMoney(item.unit_price_egp, currency)}</td>
                      <td>{formatMoney(lineTotal, currency)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#666" }}>
                    No line items
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="totals-section">
            <div className="totals-box">
              <div className="totals-row">
                <span>Subtotal</span>
                <span className="val">{formatMoney(subtotal, currency)}</span>
              </div>

              {discount > 0 ? (
                <div className="totals-row discount">
                  <span>
                    Discount
                    {invoice.discount_code ? ` (${invoice.discount_code})` : ""}
                  </span>
                  <span className="val">
                    − {formatMoney(discount, currency)}
                  </span>
                </div>
              ) : null}

              {tax > 0 ? (
                <div className="totals-row">
                  <span>Tax{taxRate ? ` (${taxRate}%)` : ""}</span>
                  <span className="val">{formatMoney(tax, currency)}</span>
                </div>
              ) : null}

              {shipping > 0 ? (
                <div className="totals-row">
                  <span>Shipping</span>
                  <span className="val">{formatMoney(shipping, currency)}</span>
                </div>
              ) : null}

              <div className="totals-grand">
                <span className="label">Total Due</span>
                <span className="amount">{formatMoney(total, currency)}</span>
              </div>
            </div>
          </div>

          {invoice.notes ? (
            <div className="notes-block">
              <div className="notes-label">Notes</div>
              <div className="notes-text">{invoice.notes}</div>
            </div>
          ) : null}
        </div>

        <div className="inv-footer">
          <div className="footer-note">
            This invoice was auto-generated by {store.name}. All prices are in{" "}
            {currencyFull} ({currency}). Thank you for your business!
          </div>
          {invoice.hideActions ? null : (
            <div className="footer-actions inv-no-print">
              <button
                type="button"
                className="inv-btn"
                onClick={() => printInvoiceElement()}
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              {invoice.downloadUrl ? (
                <button
                  type="button"
                  className="inv-btn inv-btn-primary"
                  disabled={downloadingPdf}
                  onClick={() => void handleDownloadPdf()}
                >
                  {downloadingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden />
                  )}
                  {downloadingPdf ? "Downloading…" : "Download PDF"}
                </button>
              ) : null}
            </div>
          )}
          {downloadError ? (
            <p className="inv-no-print mt-2 text-xs font-medium text-red-600">{downloadError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
