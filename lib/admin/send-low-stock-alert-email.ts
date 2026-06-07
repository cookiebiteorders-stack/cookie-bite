import { sendTemplateEmail } from "@/lib/email/send";
import { SITE } from "@/lib/data";
import { buildLowStockTableRows, type LowStockProductRow } from "@/lib/admin/low-stock-table-rows";

export type { LowStockProductRow };

function managerNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim();
  if (!local) return "Team";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function sendLowStockAlertEmail(opts: {
  to: string;
  products: LowStockProductRow[];
  lowStockCount: number;
  threshold: number;
  lang?: "en" | "ar";
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const inventoryUrl = appUrl ? `${appUrl}/admin/products` : "/admin/products";
  const alertDate = new Date().toLocaleDateString(opts.lang === "en" ? "en-GB" : "ar-EG", {
    dateStyle: "medium",
  });

  await sendTemplateEmail({
    to: opts.to,
    templateKey: "report-low-stock",
    lang: opts.lang ?? "ar",
    vars: {
      store_name: SITE.name,
      manager_name: managerNameFromEmail(opts.to),
      alert_date: alertDate,
      low_stock_count: opts.lowStockCount,
      threshold: opts.threshold,
      low_stock_rows: buildLowStockTableRows(opts.products),
      inventory_url: inventoryUrl,
    },
    immediate: true,
  });
}
