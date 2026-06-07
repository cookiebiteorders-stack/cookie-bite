import type { SupabaseClient } from "@supabase/supabase-js";
import { sendInternalEmail } from "@/lib/email/send";
import {
  canSendStockAlert,
  clearExpiredProductDiscounts,
  getProductCatalogSettings,
  markStockAlertSent,
  publishScheduledProducts,
  runProductStockRules,
} from "@/lib/admin/product-catalog-automation";
import { revalidateStorefrontCatalog } from "@/lib/storefront/revalidate-catalog";
import { revalidatePath } from "next/cache";

export type ProductCatalogAutomationResult = {
  published: number;
  discounts_cleared: number;
  deactivated_zero_stock: number;
  low_stock_count: number;
  alert_sent: boolean;
};

export async function runProductCatalogAutomation(
  supabase: SupabaseClient,
): Promise<ProductCatalogAutomationResult> {
  const settings = await getProductCatalogSettings(supabase);

  const published = await publishScheduledProducts(supabase);
  const discounts_cleared = await clearExpiredProductDiscounts(supabase);
  const stock = await runProductStockRules(supabase, settings);

  let alert_sent = false;
  if (stock.low_stock_count > 0 && canSendStockAlert(settings)) {
    const recipient =
      settings.alert_recipient_email?.trim() ||
      process.env.ADMIN_ALERT_EMAIL?.trim() ||
      process.env.RESEND_FROM_EMAIL?.trim();

    if (recipient && settings.email_alerts_enabled) {
      const { data: lowProducts } = await supabase
        .from("products")
        .select("name, title_en, sku, stock")
        .eq("is_active", true)
        .gt("stock", 0)
        .lte("stock", settings.low_stock_threshold)
        .order("stock", { ascending: true })
        .limit(15);

      const rowsHtml = (lowProducts ?? [])
        .map(
          (p) =>
            `<tr><td>${p.title_en ?? p.name}</td><td>${p.sku ?? "—"}</td><td>${p.stock}</td></tr>`,
        )
        .join("");

      try {
        await sendInternalEmail({
          to: recipient,
          subject: `⚠️ تنبيه مخزون منخفض · Cookie Bite`,
          html: `<p>مرحباً،</p><p>${stock.low_stock_count} منتج(ات) بمخزون ≤ ${settings.low_stock_threshold}.</p><table border="1" cellpadding="6"><tr><th>المنتج</th><th>SKU</th><th>المخزون</th></tr>${rowsHtml}</table><p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/products">فتح لوحة المنتجات</a></p>`,
          emailType: "notification",
          templateKey: "report-low-stock",
          immediate: true,
        });
        await markStockAlertSent(supabase);
        alert_sent = true;
      } catch {
        /* non-fatal */
      }
    }
  }

  if (published > 0 || discounts_cleared > 0 || stock.deactivated > 0) {
    try {
      await revalidateStorefrontCatalog();
      revalidatePath("/");
      revalidatePath("/shop");
      revalidatePath("/api/products");
    } catch {
      /* non-fatal */
    }
  }

  return {
    published,
    discounts_cleared,
    deactivated_zero_stock: stock.deactivated,
    low_stock_count: stock.low_stock_count,
    alert_sent,
  };
}
