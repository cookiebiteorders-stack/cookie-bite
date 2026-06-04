import { format } from "date-fns";
import type { AdminOrderRow } from "@/lib/admin/orders-operations-types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatOrderDate(iso: string): string {
  try {
    return format(new Date(iso), "yyyy-MM-dd HH:mm");
  } catch {
    return iso;
  }
}

export function buildOrdersPrintHtml(
  orders: AdminOrderRow[],
  opts?: { title?: string; subtitle?: string },
): string {
  const title = opts?.title ?? "قائمة الطلبات — Cookie Bite";
  const subtitle =
    opts?.subtitle ?? `تاريخ الطباعة: ${format(new Date(), "yyyy-MM-dd HH:mm")} · ${orders.length} طلب`;

  const head = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      font-size: 11px;
      color: #2d1a0e;
      padding: 16px;
      direction: rtl;
    }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { color: #6b5344; margin-bottom: 16px; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border: 1px solid #e0c9b0;
      padding: 6px 8px;
      text-align: right;
      vertical-align: top;
    }
    th {
      background: #fde8d0;
      font-weight: 700;
      font-size: 10px;
    }
    tr:nth-child(even) td { background: #fdf6ef; }
    .num { font-variant-numeric: tabular-nums; direction: ltr; text-align: left; }
    @media print {
      body { padding: 0; }
      @page { size: A4 landscape; margin: 10mm; }
    }
  </style>
</head>
<body>`;

  const rows = orders
    .map(
      (o) => `<tr>
        <td class="num">${escapeHtml(o.order_code ?? o.id.slice(0, 8))}</td>
        <td>${escapeHtml(o.guest_email ?? "—")}</td>
        <td class="num">${o.total_egp}</td>
        <td>${escapeHtml(o.status)}</td>
        <td>${escapeHtml(o.payment_status)}</td>
        <td>${escapeHtml(o.payment_method ?? "—")}</td>
        <td class="num">${formatOrderDate(o.created_at)}</td>
      </tr>`,
    )
    .join("");

  const table = `<h1>${escapeHtml(title)}</h1>
<p class="meta">${escapeHtml(subtitle)}</p>
<table>
  <thead>
    <tr>
      <th>رمز الطلب</th>
      <th>البريد</th>
      <th>الإجمالي (ج.م)</th>
      <th>الحالة</th>
      <th>الدفع</th>
      <th>طريقة الدفع</th>
      <th>التاريخ</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;

  return `${head}${table}</body></html>`;
}

/** Opens a print-only window with the orders table (not the admin page). */
export function printOrdersList(
  orders: AdminOrderRow[],
  opts?: { title?: string; subtitle?: string },
): boolean {
  if (!orders.length) return false;

  const html = buildOrdersPrintHtml(orders, opts);
  const win = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!win) return false;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();

  const triggerPrint = () => {
    win.print();
    win.onafterprint = () => win.close();
  };

  if (win.document.readyState === "complete") {
    triggerPrint();
  } else {
    win.onload = triggerPrint;
  }

  return true;
}
