import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { promoCodeSchema, bilingualError } from "@/lib/validations";
import { logStructuredError } from "@/lib/logger";
import {
  fetchActivePromoByCode,
  validatePromoForCart,
} from "@/lib/promo/validate-promo";
import {
  fetchRecoveryDiscountByCode,
  validateRecoveryDiscountForCart,
} from "@/lib/cart/recovery-discount";

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

  let promo;
  try {
    promo = await fetchActivePromoByCode(supabase, code);
  } catch (error) {
    logStructuredError("/api/promo/validate", error, { code: code.toUpperCase() });
    return NextResponse.json(
      {
        valid: false,
        ...bilingualError("Server error", "خطأ في الخادم"),
      },
      { status: 500 },
    );
  }

  let result = validatePromoForCart(promo, cart_total);
  if (!result.valid) {
    try {
      const recovery = await fetchRecoveryDiscountByCode(supabase, code);
      result = validateRecoveryDiscountForCart(recovery, cart_total);
    } catch (error) {
      logStructuredError("/api/promo/validate recovery", error, { code: code.toUpperCase() });
    }
  }
  if (!result.valid) {
    return NextResponse.json({
      valid: false,
      ...bilingualError(result.error_en, result.error_ar),
    });
  }

  return NextResponse.json({
    valid: true,
    discount_amount: result.discount_amount,
    type: result.promo.type,
    value: result.promo.value,
    code: result.promo.code,
  });
}
