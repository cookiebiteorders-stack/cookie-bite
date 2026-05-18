/** Shared invoice document CSS — used by React view, static HTML, and server PDF. */
export const INVOICE_PRINT_STYLES = `
.inv-root {
  --inv-orange: #ff6b00;
  --inv-orange-dark: #e05e00;
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
  font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif;
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
  font-family: "DM Serif Display", Georgia, serif;
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
.inv-meta-item { display: flex; flex-direction: column; gap: 4px; }
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
.inv-meta-val.accent { color: var(--inv-orange); font-weight: 700; }
.inv-body { padding: 36px 48px; }
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
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 5px 14px;
  border-radius: 6px;
  border: 1px solid transparent;
}
.inv-status-paid { background: var(--inv-green-bg); color: var(--inv-green); border-color: var(--inv-green-border); }
.inv-status-pending { background: var(--inv-amber-bg); color: var(--inv-amber); border-color: var(--inv-amber-border); }
.inv-status-failed { background: var(--inv-red-bg); color: var(--inv-red); border-color: var(--inv-red-border); }
.inv-status-refunded { background: var(--inv-blue-bg); color: var(--inv-blue); border-color: var(--inv-blue-border); }
.txn-info { font-size: 12px; color: var(--inv-text-muted); }
.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 28px;
  table-layout: fixed;
}
.items-table thead tr { border-bottom: 1.5px solid var(--inv-border); }
.items-table th {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--inv-text-muted);
  padding: 0 0 12px;
  text-align: left;
}
.items-table th:nth-child(2) { text-align: center; width: 10%; }
.items-table th:nth-child(3) { text-align: right; width: 22%; }
.items-table th:nth-child(4) { text-align: right; width: 22%; }
.items-table th:first-child { width: 46%; }
.items-table tbody tr { border-bottom: 1px solid var(--inv-border); }
.items-table td {
  padding: 16px 0;
  font-size: 13px;
  color: var(--inv-text-primary);
  vertical-align: middle;
}
.items-table td:nth-child(2) { text-align: center; }
.items-table td:nth-child(3) { text-align: right; color: var(--inv-text-muted); }
.items-table td:nth-child(4) { text-align: right; font-weight: 600; }
.item-name { font-weight: 600; display: block; margin-bottom: 3px; }
.item-sku { font-size: 11px; color: var(--inv-text-muted); display: block; }
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
}
.totals-section { display: flex; justify-content: flex-end; margin-bottom: 32px; }
.totals-box { width: 320px; max-width: 100%; }
.totals-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid var(--inv-border);
  font-size: 13px;
  color: var(--inv-text-muted);
}
.totals-row .val { color: var(--inv-text-primary); font-weight: 600; }
.totals-row.discount .val { color: var(--inv-green); }
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
  font-family: "DM Serif Display", Georgia, serif;
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
.notes-text { font-size: 13px; color: var(--inv-text-muted); line-height: 1.7; }
.inv-footer {
  padding: 24px 48px;
  border-top: 1px solid var(--inv-border);
}
.footer-note {
  font-size: 11px;
  color: var(--inv-text-muted);
  line-height: 1.7;
}
@media print {
  .inv-no-print { display: none !important; }
  .inv-wrap {
    box-shadow: none !important;
    border-radius: 0 !important;
    max-width: none !important;
  }
  .inv-header {
    background: var(--inv-dark-bg) !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .inv-badge,
  .totals-grand {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .totals-grand,
  .items-table thead tr,
  .party-grid,
  .pay-status-row {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
`;
