import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";

const patchSchema = z.object({
  is_active: z.boolean().optional(),
  value: z.number().positive().optional(),
  max_uses: z.number().int().min(1).nullable().optional(),
  max_uses_per_user: z.number().int().min(1).optional(),
  expires_at: z.string().datetime().nullable().optional(),
  starts_at: z.string().datetime().optional(),
  min_order_amount_egp: z.number().min(0).optional(),
  campaign_tag: z.string().max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const actor = await requireAdminAccess("discounts");
  requireWritePermission(actor);
  const { id } = await context.params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), {
      status: 400,
    });
  }

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!before) {
    return NextResponse.json(
      bilingualError("Discount not found", "الخصم غير موجود"),
      { status: 404 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.is_active !== undefined) patch.is_active = parsed.data.is_active;
  if (parsed.data.value !== undefined) patch.value = parsed.data.value;
  if (parsed.data.max_uses !== undefined) patch.max_uses = parsed.data.max_uses;
  if (parsed.data.min_order_amount_egp !== undefined) {
    patch.min_order_amount_egp = parsed.data.min_order_amount_egp;
  }
  if (parsed.data.expires_at !== undefined) {
    patch.valid_until = parsed.data.expires_at;
  }
  if (parsed.data.starts_at !== undefined) {
    patch.valid_from = parsed.data.starts_at;
  }
  if (parsed.data.max_uses_per_user !== undefined) {
    patch.max_uses_per_user = parsed.data.max_uses_per_user;
  }
  if (parsed.data.metadata !== undefined) {
    patch.metadata = parsed.data.metadata;
  } else if (parsed.data.campaign_tag !== undefined) {
    const meta =
      typeof before.metadata === "object" && before.metadata
        ? { ...(before.metadata as Record<string, unknown>) }
        : {};
    meta.campaign_tag = parsed.data.campaign_tag;
    patch.metadata = meta;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(bilingualError("Nothing to update", "لا يوجد شيء للتحديث"), {
      status: 400,
    });
  }

  const { data, error } = await supabase
    .from("promo_codes")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      bilingualError("Failed to update discount", "فشل تحديث الخصم"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "discount.update",
    module: "discounts",
    entity_id: id,
    before: before ?? undefined,
    after: data,
    request: req,
  });

  return NextResponse.json({ ok: true, discount: data });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const actor = await requireAdminAccess("discounts");
  requireWritePermission(actor);
  const { id } = await context.params;

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      bilingualError("Failed to delete discount", "فشل حذف الخصم"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "discount.delete",
    module: "discounts",
    entity_id: id,
    before: before ?? undefined,
    request: req,
  });

  return NextResponse.json({ ok: true });
}
