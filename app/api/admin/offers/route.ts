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

const createSchema = z.object({
  name_en: z.string().min(2).max(120),
  name_ar: z.string().min(2).max(120),
  product_ids: z.array(z.string().uuid()).default([]),
  addon_items: z.array(addonItemSchema).default([]),
  offer_price_egp: z.number().positive(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().default(true),
});

export async function GET() {
  await requireAdminAccess("discounts");
  const supabase = createSupabaseAdminClient();
  const catalog = await loadOfferCatalog();

  const { data, error } = await supabase
    .from("bundle_offers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      bilingualError("Failed to load offers", "فشل تحميل العروض"),
      { status: 500 },
    );
  }

  const offers = (data ?? []).map((row) =>
    enrichBundleOffer(mapBundleOfferRow(row as Record<string, unknown>), catalog),
  );
  const active = offers.filter((o) => o.is_currently_valid).length;

  return NextResponse.json({
    offers,
    catalog,
    stats: {
      total: offers.length,
      active,
      products_count: catalog.products.length,
      addons_count: catalog.addons.length,
    },
    meta: { can_write: true },
  });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("discounts");
  requireWritePermission(actor);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ...bilingualError("Invalid payload", "بيانات غير صالحة"), details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const composition = validateOfferComposition(body.product_ids, body.addon_items);
  if (!composition.ok) {
    return NextResponse.json(composition.message, { status: 400 });
  }

  const catalog = await loadOfferCatalog();
  const pricing = computeOfferPricing({
    productIds: body.product_ids,
    addonItems: body.addon_items,
    offerPriceEgp: body.offer_price_egp,
    products: catalog.products,
    addonOptions: catalog.addons,
  });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bundle_offers")
    .insert({
      name_en: body.name_en.trim(),
      name_ar: body.name_ar.trim(),
      product_ids: body.product_ids,
      addon_items: body.addon_items,
      offer_price_egp: body.offer_price_egp,
      original_total_egp: pricing.original_total_egp,
      avg_price_per_product_egp: pricing.avg_price_per_product_egp,
      starts_at: body.starts_at,
      ends_at: body.ends_at ?? null,
      is_active: body.is_active,
      created_by: actor.user_id,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("bundle_offers POST", error);
    return NextResponse.json(
      bilingualError("Failed to create offer", "فشل إنشاء العرض"),
      { status: 500 },
    );
  }

  const offer = enrichBundleOffer(mapBundleOfferRow(data as Record<string, unknown>), catalog);

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "offer.create",
    module: "discounts",
    entity_id: offer.id,
    after: offer,
    request: req,
  });

  return NextResponse.json({ ok: true, offer }, { status: 201 });
}
