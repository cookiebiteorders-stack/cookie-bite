import type { SupabaseClient } from "@supabase/supabase-js";

export type PromoRow = {
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

export type PromoValidationResult =
  | {
      valid: true;
      promo: PromoRow;
      discount_amount: number;
    }
  | {
      valid: false;
      error_en: string;
      error_ar: string;
    };

export function validatePromoForCart(
  promo: PromoRow | null | undefined,
  cartSubtotal: number,
): PromoValidationResult {
  if (!promo) {
    return {
      valid: false,
      error_en: "Invalid promo code",
      error_ar: "كود الخصم غير صالح",
    };
  }

  const now = new Date();
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return {
      valid: false,
      error_en: "Promo code has expired",
      error_ar: "انتهت صلاحية كود الخصم",
    };
  }

  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return {
      valid: false,
      error_en: "Promo code is not active yet",
      error_ar: "كود الخصم لم يبدأ بعد",
    };
  }

  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return {
      valid: false,
      error_en: "Promo code has reached its limit",
      error_ar: "وصل كود الخصم للحد الأقصى",
    };
  }

  if (cartSubtotal < Number(promo.min_order_amount_egp)) {
    return {
      valid: false,
      error_en: `Minimum order is ${promo.min_order_amount_egp} EGP`,
      error_ar: `الحد الأدنى للطلب ${promo.min_order_amount_egp} ج.م`,
    };
  }

  const rawDiscount =
    promo.type === "percent"
      ? Math.round(((cartSubtotal * Number(promo.value)) / 100) * 100) / 100
      : Number(promo.value);

  return {
    valid: true,
    promo,
    discount_amount: Math.min(rawDiscount, cartSubtotal),
  };
}

export async function fetchActivePromoByCode(
  supabase: SupabaseClient,
  code: string,
): Promise<PromoRow | null> {
  const { data, error } = await supabase
    .from("promo_codes")
    .select(
      "id, code, type, value, min_order_amount_egp, max_uses, used_count, is_active, valid_from, valid_until",
    )
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .maybeSingle<PromoRow>();

  if (error) throw error;
  return data;
}

/** يسجّل استخدام الكوبون ويزيد العداد بعد إنشاء الطلب. */
export async function recordPromoUse(params: {
  supabase: SupabaseClient;
  promoId: string;
  orderId: string;
  userId: string | null;
}): Promise<void> {
  const { supabase, promoId, orderId, userId } = params;

  await supabase.from("promo_code_uses").insert({
    promo_code_id: promoId,
    user_id: userId,
    order_id: orderId,
  });

  const { data } = await supabase
    .from("promo_codes")
    .select("used_count")
    .eq("id", promoId)
    .maybeSingle<{ used_count: number }>();

  const nextCount = (data?.used_count ?? 0) + 1;
  await supabase.from("promo_codes").update({ used_count: nextCount }).eq("id", promoId);
}
