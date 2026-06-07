import type { SupabaseClient } from "@supabase/supabase-js";
import { sendLowStockAlertEmail } from "@/lib/admin/send-low-stock-alert-email";
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

      const rows = (lowProducts ?? []).map((p) => ({
        name: String(p.title_en ?? p.name ?? "Product"),
        sku: p.sku ? String(p.sku) : null,
        stock: Number(p.stock ?? 0),
      }));

      try {
        await sendLowStockAlertEmail({
          to: recipient,
          products: rows,
          lowStockCount: stock.low_stock_count,
          threshold: settings.low_stock_threshold,
          lang: "ar",
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
