import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePromoMetadata, type PromoMetadata, type PromoRuleKey } from "@/lib/promo/promo-metadata";

export type PromoRow = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order_amount_egp: number;
  max_uses: number | null;
  max_uses_per_user?: number;
  used_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  metadata?: PromoMetadata | Record<string, unknown> | null;
  applicable_product_ids?: string[] | null;
};

export type PromoValidationResult =
  | {
      valid: true;
      promo: PromoRow;
      discount_amount: number;
      free_shipping: boolean;
    }
  | {
      valid: false;
      error_en: string;
      error_ar: string;
    };

export type PromoValidationContext = {
  cartSubtotal: number;
  cartProductIds?: string[];
  userId?: string | null;
  supabase?: SupabaseClient;
};

const PROMO_SELECT =
  "id, code, type, value, min_order_amount_egp, max_uses, max_uses_per_user, used_count, is_active, valid_from, valid_until, metadata, applicable_product_ids";

function computeDiscount(promo: PromoRow, cartSubtotal: number): number {
  const rawDiscount =
    promo.type === "percent"
      ? Math.round(((cartSubtotal * Number(promo.value)) / 100) * 100) / 100
      : Number(promo.value);
  return Math.min(rawDiscount, cartSubtotal);
}

function ruleFailed(
  key: PromoRuleKey,
  ctx: PromoValidationContext,
  meta: PromoMetadata,
  promo: PromoRow,
): string | null {
  const keys = meta.rules?.keys ?? [];
  if (!keys.includes(key)) return null;

  if (key === "cart_total") {
    if (ctx.cartSubtotal < Number(promo.min_order_amount_egp)) {
      return "cart_total";
    }
  }

  if (key === "cookies_only") {
    const allowed = promo.applicable_product_ids ?? [];
    const cartIds = ctx.cartProductIds ?? [];
    if (allowed.length > 0 && cartIds.length > 0) {
      const ok = cartIds.every((id) => allowed.includes(id));
      if (!ok) return "cookies_only";
    }
  }

  if (key === "first_order" && ctx.supabase && ctx.userId) {
    return null;
  }

  if (key === "vip_only" && ctx.supabase && ctx.userId) {
    return null;
  }

  return null;
}

async function checkAsyncRules(
  promo: PromoRow,
  meta: PromoMetadata,
  ctx: PromoValidationContext,
): Promise<PromoValidationResult | null> {
  const keys = meta.rules?.keys ?? [];
  const mode = meta.rules?.mode ?? "AND";
  const failures: PromoRuleKey[] = [];

  for (const key of keys) {
    if (key === "first_order") {
      if (!ctx.userId) {
        failures.push(key);
        continue;
      }
      const { count } = await ctx.supabase!
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", ctx.userId)
        .neq("status", "cancelled");
      if ((count ?? 0) > 0) failures.push(key);
      continue;
    }

    if (key === "vip_only") {
      if (!ctx.userId) {
        failures.push(key);
        continue;
      }
      const { data: user } = await ctx.supabase!
        .from("profiles")
        .select("points")
        .eq("id", ctx.userId)
        .maybeSingle();
      if ((user?.points ?? 0) < 1500) failures.push(key);
      continue;
    }

    const syncFail = ruleFailed(key, ctx, meta, promo);
    if (syncFail) failures.push(key);
  }

  const passedCount = keys.length - failures.length;
  const failed =
    mode === "AND"
      ? failures.length > 0
      : keys.length > 0 && passedCount === 0;

  if (!failed) return null;

  if (failures.includes("first_order")) {
    return {
      valid: false,
      error_en: "This code is for first orders only",
      error_ar: "هذا الكود للطلب الأول فقط",
    };
  }
  if (failures.includes("vip_only")) {
    return {
      valid: false,
      error_en: "VIP membership required for this code",
      error_ar: "هذا الكود لأعضاء VIP فقط",
    };
  }
  if (failures.includes("cookies_only")) {
    return {
      valid: false,
      error_en: "Code applies to selected cookie products only",
      error_ar: "الكود يخص منتجات الكوكيز المحددة فقط",
    };
  }

  return {
    valid: false,
    error_en: "Promo conditions not met",
    error_ar: "شروط الكوبون غير مستوفاة",
  };
}

export function validatePromoForCart(
  promo: PromoRow | null | undefined,
  cartSubtotal: number,
  context?: Omit<PromoValidationContext, "cartSubtotal">,
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

  const meta = parsePromoMetadata(promo.metadata);
  const productIds = promo.applicable_product_ids ?? [];
  if (productIds.length > 0 && context?.cartProductIds?.length) {
    const ok = context.cartProductIds.every((id) => productIds.includes(id));
    if (!ok) {
      return {
        valid: false,
        error_en: "Code not valid for items in your cart",
        error_ar: "الكود غير صالح لمنتجات في سلتك",
      };
    }
  }

  const discount_amount = computeDiscount(promo, cartSubtotal);
  const free_shipping = Boolean(meta.free_shipping);

  return {
    valid: true,
    promo,
    discount_amount,
    free_shipping,
  };
}

export async function validatePromoForCartAsync(
  promo: PromoRow | null | undefined,
  context: PromoValidationContext,
): Promise<PromoValidationResult> {
  const base = validatePromoForCart(promo, context.cartSubtotal, context);
  if (!base.valid) return base;

  const meta = parsePromoMetadata(promo!.metadata);
  const ruleBlock = await checkAsyncRules(promo!, meta, context);
  if (ruleBlock) return ruleBlock;

  if (context.supabase && context.userId && promo!.max_uses_per_user) {
    const { count } = await context.supabase
      .from("promo_code_uses")
      .select("id", { count: "exact", head: true })
      .eq("promo_code_id", promo!.id)
      .eq("user_id", context.userId);
    if ((count ?? 0) >= promo!.max_uses_per_user!) {
      return {
        valid: false,
        error_en: "You have already used this promo code",
        error_ar: "استخدمت هذا الكود من قبل",
      };
    }
  }

  return base;
}

export async function fetchActivePromoByCode(
  supabase: SupabaseClient,
  code: string,
): Promise<PromoRow | null> {
  const { data, error } = await supabase
    .from("promo_codes")
    .select(PROMO_SELECT)
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
