import { z } from "zod";
import { enrichBundleOffer, loadOfferCatalog, mapBundleOfferRow } from "@/lib/offers/catalog";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CartLine } from "@/lib/cart/types";

export const bundleOfferSnapshotProductSchema = z.object({
  product_id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1).max(200),
  price_snapshot: z.number().nonnegative(),
  image: z.string().max(500).optional(),
});

export const bundleOfferSnapshotAddonSchema = z.object({
  addon_id: z.string().uuid(),
  option_id: z.string().min(1),
  name: z.string().min(1).max(200),
  price_snapshot: z.number().nonnegative(),
});

export const bundleOfferOrderSnapshotSchema = z.object({
  offer_id: z.string().uuid(),
  name_en: z.string().min(1).max(200),
  name_ar: z.string().min(1).max(200),
  offer_price_egp: z.number().positive(),
  original_total_egp: z.number().nonnegative(),
  savings_egp: z.number().nonnegative(),
  products: z.array(bundleOfferSnapshotProductSchema),
  addons: z.array(bundleOfferSnapshotAddonSchema),
});

export type BundleOfferOrderSnapshot = z.infer<typeof bundleOfferOrderSnapshotSchema>;

export function buildBundleOfferSnapshotFromCartLine(
  line: CartLine,
): BundleOfferOrderSnapshot | null {
  const bundle = line.bundleOffer;
  if (!bundle) return null;
  return {
    offer_id: bundle.offer_id,
    name_en: bundle.name_en,
    name_ar: bundle.name_ar,
    offer_price_egp: bundle.offer_price_egp,
    original_total_egp: bundle.original_total_egp,
    savings_egp: bundle.savings_egp,
    products: bundle.products,
    addons: bundle.addons,
  };
}

export async function validateBundleOfferSnapshot(snapshot: BundleOfferOrderSnapshot) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bundle_offers")
    .select("*")
    .eq("id", snapshot.offer_id)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false as const,
      error: "Bundle offer not found",
      error_ar: "عرض الباقة غير موجود",
    };
  }

  const catalog = await loadOfferCatalog();
  const offer = enrichBundleOffer(mapBundleOfferRow(data as Record<string, unknown>), catalog);

  if (!offer.is_currently_valid) {
    return {
      ok: false as const,
      error: "This bundle offer is no longer available",
      error_ar: "عرض الباقة لم يعد متاحاً",
    };
  }

  if (Math.abs(offer.offer_price_egp - snapshot.offer_price_egp) > 0.01) {
    return {
      ok: false as const,
      error: "Bundle offer price changed — refresh your cart",
      error_ar: "تغيّر سعر العرض — حدّث السلة",
    };
  }

  const productIds = [...offer.product_ids].sort().join(",");
  const snapshotProductIds = snapshot.products
    .map((p) => p.product_id)
    .sort()
    .join(",");
  if (productIds !== snapshotProductIds) {
    return {
      ok: false as const,
      error: "Bundle offer contents changed — refresh your cart",
      error_ar: "تغيّر محتوى العرض — حدّث السلة",
    };
  }

  const addonKeys = offer.addon_items
    .map((a) => `${a.addon_id}:${a.option_id}`)
    .sort()
    .join(",");
  const snapshotAddonKeys = snapshot.addons
    .map((a) => `${a.addon_id}:${a.option_id}`)
    .sort()
    .join(",");
  if (addonKeys !== snapshotAddonKeys) {
    return {
      ok: false as const,
      error: "Bundle offer add-ons changed — refresh your cart",
      error_ar: "تغيّرت إضافات العرض — حدّث السلة",
    };
  }

  return { ok: true as const, offer };
}
