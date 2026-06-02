import type { SupabaseClient } from "@supabase/supabase-js";
import type { PromoValidationResult } from "@/lib/promo/validate-promo";

export type RecoveryDiscountRow = {
  id: string;
  cart_id: string;
  code: string;
  discount_percent: number;
  expires_at: string;
  is_used: boolean;
};

export async function fetchRecoveryDiscountByCode(
  supabase: SupabaseClient,
  codeRaw: string,
): Promise<RecoveryDiscountRow | null> {
  const code = codeRaw.trim().toUpperCase();
  if (code.length < 4) return null;

  const { data, error } = await supabase
    .from("recovery_discount_codes")
    .select("id, cart_id, code, discount_percent, expires_at, is_used")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) return null;
  return data as RecoveryDiscountRow;
}

export function validateRecoveryDiscountForCart(
  row: RecoveryDiscountRow | null | undefined,
  cartSubtotal: number,
): PromoValidationResult {
  if (!row) {
    return {
      valid: false,
      error_en: "Invalid promo code",
      error_ar: "كود الخصم غير صالح",
    };
  }
  if (row.is_used) {
    return {
      valid: false,
      error_en: "This recovery code was already used",
      error_ar: "تم استخدام كود الاسترداد مسبقاً",
    };
  }
  if (new Date(row.expires_at) < new Date()) {
    return {
      valid: false,
      error_en: "Recovery code has expired",
      error_ar: "انتهت صلاحية كود الاسترداد",
    };
  }
  if (cartSubtotal <= 0) {
    return {
      valid: false,
      error_en: "Cart is empty",
      error_ar: "السلة فارغة",
    };
  }

  const discount_amount =
    Math.round(((cartSubtotal * Number(row.discount_percent)) / 100) * 100) / 100;

  return {
    valid: true,
    promo: {
      id: row.id,
      code: row.code,
      type: "percent",
      value: row.discount_percent,
      min_order_amount_egp: 0,
      max_uses: 1,
      used_count: row.is_used ? 1 : 0,
      is_active: true,
      valid_from: new Date(0).toISOString(),
      valid_until: row.expires_at,
    },
    discount_amount,
  };
}

export async function markRecoveryDiscountUsed(
  supabase: SupabaseClient,
  codeRaw: string,
): Promise<void> {
  const code = codeRaw.trim().toUpperCase();
  await supabase.from("recovery_discount_codes").update({ is_used: true }).eq("code", code);
}

export function buildRecoveryDiscountCode(cartId: string): string {
  return `BACK${cartId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
