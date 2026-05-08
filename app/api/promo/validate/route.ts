import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { promoCodeSchema, bilingualError } from "@/lib/validations";
import { logStructuredError } from "@/lib/logger";

type PromoRow = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order_amount_egp: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
};

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { valid: false, ...bilingualError("Invalid JSON", "صيغة غير صالحة") },
      { status: 400 },
    );
  }

  const parsed = promoCodeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        valid: false,
        ...bilingualError("Invalid request", "طلب غير صالح"),
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { code, cart_total } = parsed.data;
  const supabase = createSupabaseAdminClient();

  const { data: promo, error } = await supabase
    .from("promo_codes")
    .select(
      "id, code, type, value, min_order_amount_egp, max_uses, used_count, is_active, valid_from, valid_until",
    )
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .maybeSingle<PromoRow>();

  if (error) {
    logStructuredError("/api/promo/validate", error, { code: code.toUpperCase() });
    return NextResponse.json(
      {
        valid: false,
        ...bilingualError("Server error", "خطأ في الخادم"),
      },
      { status: 500 },
    );
  }

  if (!promo) {
    return NextResponse.json({
      valid: false,
      ...bilingualError("Invalid promo code", "كود الخصم غير صالح"),
    });
  }

  const now = new Date();
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return NextResponse.json({
      valid: false,
      ...bilingualError(
        "Promo code has expired",
        "انتهت صلاحية كود الخصم",
      ),
    });
  }

  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return NextResponse.json({
      valid: false,
      ...bilingualError(
        "Promo code is not active yet",
        "كود الخصم لم يبدأ بعد",
      ),
    });
  }

  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return NextResponse.json({
      valid: false,
      ...bilingualError(
        "Promo code has reached its limit",
        "وصل كود الخصم للحد الأقصى",
      ),
    });
  }

  if (cart_total < promo.min_order_amount_egp) {
    return NextResponse.json({
      valid: false,
      ...bilingualError(
        `Minimum order is ${promo.min_order_amount_egp} EGP`,
        `الحد الأدنى للطلب ${promo.min_order_amount_egp} ج.م`,
      ),
    });
  }

  const discount =
    promo.type === "percent"
      ? Math.round(((cart_total * promo.value) / 100) * 100) / 100
      : promo.value;

  return NextResponse.json({
    valid: true,
    discount_amount: Math.min(discount, cart_total),
    type: promo.type,
    value: promo.value,
    code: promo.code,
  });
}
