import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getAbandonedCartByToken,
  markAbandonedCartRecovered,
  type AbandonedCartSnapshot,
} from "@/lib/cart/abandoned";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

const paramsSchema = z.object({
  token: z.string().min(8).max(64),
});

async function loadRecoveryPayload(token: string) {
  const cart = await getAbandonedCartByToken(token);
  if (!cart || cart.is_recovered) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data: discountRow } = await supabase
    .from("recovery_discount_codes")
    .select("code, is_used, expires_at")
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let discountCode: string | null = null;
  if (
    discountRow &&
    !discountRow.is_used &&
    new Date(String(discountRow.expires_at)) > new Date()
  ) {
    discountCode = String(discountRow.code);
  }

  return {
    cartSnapshot: cart.cart_snapshot as AbandonedCartSnapshot,
    discountCode,
    cartValue: Number(cart.cart_value),
  };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const rawParams = await ctx.params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid token", "رابط غير صالح"), {
      status: 400,
    });
  }

  const payload = await loadRecoveryPayload(parsed.data.token);
  if (!payload) {
    return NextResponse.json(bilingualError("Cart not found", "السلة غير موجودة"), {
      status: 404,
    });
  }

  return NextResponse.json({ ok: true, ...payload });
}

/** Marks cart recovered when customer confirms restore. */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const rawParams = await ctx.params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid token", "رابط غير صالح"), {
      status: 400,
    });
  }

  const payload = await loadRecoveryPayload(parsed.data.token);
  if (!payload) {
    return NextResponse.json(bilingualError("Cart not found", "السلة غير موجودة"), {
      status: 404,
    });
  }

  await markAbandonedCartRecovered({ token: parsed.data.token });

  return NextResponse.json({ ok: true, ...payload });
}
