import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/admin/audit";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import {
  enrichBundleOffer,
  loadOfferCatalog,
  mapBundleOfferRow,
} from "@/lib/offers/catalog";
import { computeOfferPricing, validateOfferComposition } from "@/lib/offers/pricing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

const addonItemSchema = z.object({
  addon_id: z.string().uuid(),
  option_id: z.string().min(1),
});

const patchSchema = z.object({
  name_en: z.string().min(2).max(120).optional(),
  name_ar: z.string().min(2).max(120).optional(),
  product_ids: z.array(z.string().uuid()).optional(),
  addon_items: z.array(addonItemSchema).optional(),
  offer_price_egp: z.number().positive().optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const actor = await requireAdminAccess("discounts");
  requireWritePermission(actor);
  const { id } = await context.params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ...bilingualError("Invalid payload", "بيانات غير صالحة"), details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase
    .from("bundle_offers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!before) {
    return NextResponse.json(bilingualError("Offer not found", "العرض غير موجود"), {
      status: 404,
    });
  }

  const current = mapBundleOfferRow(before as Record<string, unknown>);
  const nextProductIds = parsed.data.product_ids ?? current.product_ids;
  const nextAddonItems = parsed.data.addon_items ?? current.addon_items;
  const nextOfferPrice = parsed.data.offer_price_egp ?? current.offer_price_egp;

  const composition = validateOfferComposition(nextProductIds, nextAddonItems);
  if (!composition.ok) {
    return NextResponse.json(composition.message, { status: 400 });
  }

  const catalog = await loadOfferCatalog();
  const pricing = computeOfferPricing({
    productIds: nextProductIds,
    addonItems: nextAddonItems,
    offerPriceEgp: nextOfferPrice,
    products: catalog.products,
    addonOptions: catalog.addons,
  });

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    original_total_egp: pricing.original_total_egp,
    avg_price_per_product_egp: pricing.avg_price_per_product_egp,
  };

  if (parsed.data.name_en !== undefined) patch.name_en = parsed.data.name_en.trim();
  if (parsed.data.name_ar !== undefined) patch.name_ar = parsed.data.name_ar.trim();
  if (parsed.data.product_ids !== undefined) patch.product_ids = parsed.data.product_ids;
  if (parsed.data.addon_items !== undefined) patch.addon_items = parsed.data.addon_items;
  if (parsed.data.offer_price_egp !== undefined) patch.offer_price_egp = parsed.data.offer_price_egp;
  if (parsed.data.starts_at !== undefined) patch.starts_at = parsed.data.starts_at;
  if (parsed.data.ends_at !== undefined) patch.ends_at = parsed.data.ends_at;
  if (parsed.data.is_active !== undefined) patch.is_active = parsed.data.is_active;

  const { data, error } = await supabase
    .from("bundle_offers")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      bilingualError("Failed to update offer", "فشل تحديث العرض"),
      { status: 500 },
    );
  }

  const offer = enrichBundleOffer(mapBundleOfferRow(data as Record<string, unknown>), catalog);

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "offer.update",
    module: "discounts",
    entity_id: id,
    before: current,
    after: offer,
    request: req,
  });

  return NextResponse.json({ ok: true, offer });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const actor = await requireAdminAccess("discounts");
  requireWritePermission(actor);
  const { id } = await context.params;

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase
    .from("bundle_offers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("bundle_offers").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      bilingualError("Failed to delete offer", "فشل حذف العرض"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "offer.delete",
    module: "discounts",
    entity_id: id,
    before: before ?? undefined,
    request: req,
  });

  return NextResponse.json({ ok: true });
}
