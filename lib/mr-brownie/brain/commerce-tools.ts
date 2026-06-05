import type { CartLine } from "@/lib/cart/types";
import { cartSubtotal } from "@/lib/cart/types";
import type { AiCatalogProduct } from "@/lib/ai/website-knowledge";
import type { AiPromoOffer } from "@/lib/ai/website-knowledge";
import {
  buildAddToCartAction,
  buildApplyPromoAction,
  type ChatClientAction,
} from "@/lib/mr-brownie/chat-client-actions";
import { searchCatalogForQuery } from "@/lib/mr-brownie/brain/product-search-tool";
import type { CommerceIntent } from "@/lib/mr-brownie/brain/intent-engine";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  fetchActivePromoByCode,
  validatePromoForCart,
} from "@/lib/promo/validate-promo";

const PROMO_CODE_RE =
  /\b(?:كود|كوبون|promo|code|coupon)\s*[:\-]?\s*([A-Za-z0-9]{4,24})\b/i;

export function extractPromoCodeFromMessage(message: string): string | null {
  const m = message.trim();
  if (!m) return null;
  const labeled = m.match(PROMO_CODE_RE);
  if (labeled?.[1]) return labeled[1].toUpperCase();
  const bare = m.match(/\b([A-Z][A-Z0-9]{3,15})\b/);
  return bare?.[1]?.toUpperCase() ?? null;
}

export async function previewPromoForCart(input: {
  code: string;
  cartLines: CartLine[];
}): Promise<{
  valid: boolean;
  code: string;
  discount_egp: number | null;
  error_en?: string;
  error_ar?: string;
}> {
  const code = input.code.trim().toUpperCase();
  if (!code) {
    return { valid: false, code, discount_egp: null, error_en: "Code required", error_ar: "الكود مطلوب" };
  }
  try {
    const supabase = createSupabaseAdminClient();
    const promo = await fetchActivePromoByCode(supabase, code);
    const subtotal = cartSubtotal(input.cartLines);
    const result = validatePromoForCart(promo, subtotal);
    if (!result.valid) {
      return {
        valid: false,
        code,
        discount_egp: null,
        error_en: result.error_en,
        error_ar: result.error_ar,
      };
    }
    return {
      valid: true,
      code: result.promo.code,
      discount_egp: result.discount_amount,
    };
  } catch {
    return {
      valid: false,
      code,
      discount_egp: null,
      error_en: "Could not validate code",
      error_ar: "تعذر التحقق من الكود",
    };
  }
}

export async function buildCommerceClientActions(params: {
  intent: CommerceIntent;
  userMessage: string;
  products: AiCatalogProduct[];
  cartLines: CartLine[];
  promoOffers: AiPromoOffer[];
  locale: "ar" | "en" | "auto";
}): Promise<ChatClientAction[]> {
  const promoActions: ChatClientAction[] = [];
  const cartActions: ChatClientAction[] = [];

  const code = extractPromoCodeFromMessage(params.userMessage);
  if (code || params.intent === "promo_help") {
    const tryCode = code ?? params.promoOffers[0]?.code;
    if (tryCode) {
      const preview = await previewPromoForCart({
        code: tryCode,
        cartLines: params.cartLines,
      });
      const promoAction = buildApplyPromoAction({
        code: tryCode,
        discount_egp: preview.discount_egp,
        valid: preview.valid,
        locale: params.locale,
        error_ar: preview.error_ar,
        error_en: preview.error_en,
      });
      if (promoAction) promoActions.push(promoAction);
    }
  }

  const shoppingIntents: CommerceIntent[] = [
    "product_browse",
    "pairing",
    "budget",
    "gift_request",
    "fast_gift",
    "cart_help",
    "general",
  ];

  if (shoppingIntents.includes(params.intent)) {
    const hits = searchCatalogForQuery(params.userMessage, params.products, 3);
    for (const p of hits) {
      const atc = buildAddToCartAction(p, params.locale);
      if (atc) {
        cartActions.push(atc);
        break;
      }
    }
  }

  if (
    params.intent === "cart_help" &&
    params.cartLines.length > 0 &&
    cartActions.length === 0
  ) {
    const inStock = params.products.find((p) => p.in_stock);
    if (inStock) {
      const atc = buildAddToCartAction(inStock, params.locale);
      if (atc) cartActions.push(atc);
    }
  }

  if (!code && params.intent === "promo_help" && params.promoOffers.length && !promoActions.length) {
    const offer = params.promoOffers[0];
    promoActions.push({
      type: "apply_promo",
      code: offer.code,
      discount_egp: null,
      label_en: `Try promo ${offer.code}`,
      label_ar: `جرّب كود ${offer.code}`,
    });
  }

  return [...promoActions, ...cartActions].slice(0, 2);
}
