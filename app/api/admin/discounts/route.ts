import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import {
  buildPromoFromBuilder,
  resolveCookieProductIds,
  type PromoKind,
  type PromoRuleKey,
} from "@/lib/promo/promo-metadata";

const ruleKeysSchema = z.array(
  z.enum(["cart_total", "cookies_only", "first_order", "vip_only"]),
);

const createSchema = z.object({
  code: z.string().min(3).max(40),
  type: z.enum(["percent", "fixed"]).optional(),
  value: z.number().positive().optional(),
  builder_type: z
    .enum([
      "percent",
      "fixed",
      "shipping",
      "bogo",
      "bundle",
      "vip",
      "first-order",
      "seasonal",
      "loyalty",
    ])
    .optional(),
  starts_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
  max_uses: z.number().int().min(1).optional(),
  max_uses_per_user: z.number().int().min(1).optional(),
  min_order_amount_egp: z.number().min(0).optional(),
  active: z.boolean().default(true),
  campaign_tag: z.string().max(80).optional(),
  rule_mode: z.enum(["AND", "OR"]).optional(),
  rule_keys: ruleKeysSchema.optional(),
  applicable_product_ids: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  await requireAdminAccess("discounts");
  const supabase = createSupabaseAdminClient();
  const [{ data, error }, { count: usesTotal }] = await Promise.all([
    supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
    supabase.from("promo_code_uses").select("id", { count: "exact", head: true }),
  ]);

  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  const discounts = data ?? [];
  const active = discounts.filter((d) => d.is_active).length;
  const totalUses = discounts.reduce((a, d) => a + Number(d.used_count ?? 0), 0);

  return NextResponse.json({
    discounts,
    stats: {
      active,
      total_uses: totalUses,
      tracked_uses: usesTotal ?? 0,
      total_codes: discounts.length,
    },
  });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("discounts");
  requireWritePermission(actor);
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const body = parsed.data;
  const supabase = createSupabaseAdminClient();

  let insertRow: Record<string, unknown>;

  if (body.builder_type && body.value != null) {
    let productIds = body.applicable_product_ids ?? [];
    const ruleKeys = (body.rule_keys ?? []) as PromoRuleKey[];
    if (ruleKeys.includes("cookies_only") && productIds.length === 0) {
      productIds = await resolveCookieProductIds(supabase);
    }

    const built = buildPromoFromBuilder({
      builderType: body.builder_type as PromoKind,
      code: body.code,
      value: body.value,
      minOrder: body.min_order_amount_egp ?? 0,
      maxUses: body.max_uses,
      expiresAt: body.expires_at,
      startsAt: body.starts_at,
      campaignTag: body.campaign_tag ?? "",
      ruleMode: body.rule_mode ?? "AND",
      ruleKeys,
      productIds,
      maxUsesPerUser: body.max_uses_per_user,
    });

    insertRow = {
      code: body.code.toUpperCase(),
      type: built.type,
      value: built.value,
      valid_from: built.valid_from ?? new Date().toISOString(),
      valid_until: built.valid_until ?? null,
      max_uses: built.max_uses ?? null,
      max_uses_per_user: built.max_uses_per_user,
      min_order_amount_egp: built.min_order_amount_egp,
      applicable_product_ids: built.applicable_product_ids,
      is_active: body.active,
      metadata: built.metadata,
    };
  } else if (body.type && body.value != null) {
    insertRow = {
      code: body.code.toUpperCase(),
      type: body.type,
      value: body.value,
      valid_from: body.starts_at ?? new Date().toISOString(),
      valid_until: body.expires_at ?? null,
      max_uses: body.max_uses ?? null,
      max_uses_per_user: body.max_uses_per_user ?? 1,
      min_order_amount_egp: body.min_order_amount_egp ?? 0,
      applicable_product_ids: body.applicable_product_ids ?? [],
      is_active: body.active,
      metadata: body.metadata ?? {},
    };
  } else {
    return NextResponse.json(
      bilingualError("Missing type/value", "النوع والقيمة مطلوبان"),
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("promo_codes")
    .insert(insertRow)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      bilingualError("Failed to create discount", "فشل إنشاء الخصم"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "discount.create",
    module: "discounts",
    entity_id: data.id,
    after: data,
    request: req,
  });

  return NextResponse.json({ ok: true, discount: data });
}
