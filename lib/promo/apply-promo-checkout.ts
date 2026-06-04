import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchActivePromoByCode,
  validatePromoForCartAsync,
  type PromoRow,
} from "@/lib/promo/validate-promo";

export type CheckoutPromoResult =
  | {
      ok: true;
      promo: PromoRow;
      discount_amount: number;
      free_shipping: boolean;
    }
  | { ok: false; error_en: string; error_ar: string };

export async function applyPromoAtCheckout(params: {
  supabase: SupabaseClient;
  code: string;
  cartSubtotal: number;
  cartProductIds: string[];
  userId: string | null;
}): Promise<CheckoutPromoResult> {
  const promo = await fetchActivePromoByCode(params.supabase, params.code);
  const validation = await validatePromoForCartAsync(promo, {
    cartSubtotal: params.cartSubtotal,
    cartProductIds: params.cartProductIds,
    userId: params.userId,
    supabase: params.supabase,
  });

  if (!validation.valid) {
    return {
      ok: false,
      error_en: validation.error_en,
      error_ar: validation.error_ar,
    };
  }

  return {
    ok: true,
    promo: validation.promo,
    discount_amount: validation.discount_amount,
    free_shipping: validation.free_shipping,
  };
}
