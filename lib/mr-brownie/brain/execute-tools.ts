import type { CartLine } from "@/lib/cart/types";
import { cartSubtotal } from "@/lib/cart/types";
import type { AiCatalogProduct } from "@/lib/ai/website-knowledge";
import { searchCatalogForQuery } from "@/lib/mr-brownie/brain/product-search-tool";
import type { IntentEngineResult } from "@/lib/mr-brownie/brain/intent-engine";
import { ENV_FREE_SHIPPING_THRESHOLD_EGP } from "@/lib/store/commerce-settings-shared";

export type MrBrownieToolResults = {
  promo_preview: {
    code: string;
    valid: boolean;
    discount_egp: number | null;
    error_en?: string;
    error_ar?: string;
  } | null;
  search_products: Array<{
    id: string;
    name: string;
    price_egp: number;
    shop_path: string;
    image_url: string | null;
    in_stock: boolean;
  }>;
  gift_box_builder: {
    path: string;
    hint: string;
  };
  cart_summary: {
    items_count: number;
    subtotal_egp: number;
    amount_to_free_delivery_egp: number | null;
  } | null;
};

export function executeMrBrownieTools(params: {
  intent: IntentEngineResult;
  userMessage: string;
  products: AiCatalogProduct[];
  cartLines: CartLine[];
  promoPreview?: MrBrownieToolResults["promo_preview"];
  freeShippingThresholdEgp?: number;
}): MrBrownieToolResults {
  const tools = new Set(params.intent.tools_to_run);
  const search_products = tools.has("search_products")
    ? searchCatalogForQuery(params.userMessage, params.products, 8).map((p) => ({
        id: p.id,
        name: p.name,
        price_egp: p.price_egp,
        shop_path: p.shop_path,
        image_url: p.image_url ?? null,
        in_stock: p.in_stock,
      }))
    : [];

  const gift_box_builder = {
    path: "/gift-box/build",
    hint:
      params.intent.primary === "fast_gift"
        ? "Fast path: pre-built boxes at /gift-box or quick mix in builder."
        : "Customize flavors and message card in the gift box builder.",
  };

  let cart_summary: MrBrownieToolResults["cart_summary"] = null;
  if (tools.has("cart_summary") && params.cartLines.length > 0) {
    const subtotal = cartSubtotal(params.cartLines);
    const threshold = params.freeShippingThresholdEgp ?? ENV_FREE_SHIPPING_THRESHOLD_EGP;
    const gap = Math.max(0, threshold - subtotal);
    cart_summary = {
      items_count: params.cartLines.reduce((n, l) => n + l.quantity, 0),
      subtotal_egp: Math.round(subtotal * 100) / 100,
      amount_to_free_delivery_egp: gap > 0 ? Math.round(gap * 100) / 100 : null,
    };
  }

  return {
    promo_preview: params.promoPreview ?? null,
    search_products,
    gift_box_builder,
    cart_summary,
  };
}

export const MR_BROWNIE_TOOL_CATALOG = [
  {
    name: "search_products",
    description: "Keyword search in live catalog snapshot (server-side).",
  },
  {
    name: "gift_box_builder",
    description: "Guide user to /gift-box/build or curated /gift-box.",
  },
  {
    name: "cart_summary",
    description: "Read CONTEXT cart subtotal and free-delivery gap.",
  },
  {
    name: "promo_preview",
    description: "Validate a promo code against current cart subtotal.",
  },
  {
    name: "add_to_cart_offer",
    description: "Offer one-tap add-to-cart via client_actions (UI executes).",
  },
] as const;
