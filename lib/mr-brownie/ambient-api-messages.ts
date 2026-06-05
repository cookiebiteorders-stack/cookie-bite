import type { UserRole } from "@/lib/admin/rbac";
import { BRAND } from "@/lib/brand";
import type { Lang } from "@/lib/i18n/translations";
import { buildProactiveSellingLine } from "@/lib/mr-brownie/proactive-selling";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const FALLBACK_NAMES_AR = [
  "كوكيز الكلاسيك",
  "صندوق الهدايا",
  "البراونيز",
  "كوكيز محشية",
] as const;

const FALLBACK_NAMES_EN = [
  "Classic Cookies",
  "Gift Box",
  "Brownies",
  "Stuffed Cookies",
] as const;

export function buildAmbientApiMessage(params: {
  locale: Lang;
  resolvedRole: UserRole | "guest";
  cartItems: number;
  cartSubtotal: number;
  productNames: string[];
  pdpDwellSeconds?: number;
  productSlug?: string | null;
  productName?: string | null;
  cartIdleMinutes?: number;
}): string {
  const { locale, resolvedRole, cartItems, cartSubtotal, productNames } = params;

  const proactive = buildProactiveSellingLine({
    locale,
    cartItems,
    cartSubtotalEgp: cartSubtotal,
    pdpDwellSeconds: params.pdpDwellSeconds,
    productSlug: params.productSlug,
    productName: params.productName,
    cartIdleMinutes: params.cartIdleMinutes,
  });
  if (proactive) return proactive;
  const ar = locale === "ar";
  const namePool =
    productNames.length > 0
      ? productNames.slice(0, 6)
      : ar
        ? [...FALLBACK_NAMES_AR]
        : [...FALLBACK_NAMES_EN];
  const pickName = () => pick(namePool);
  const freeShipThreshold = BRAND.freeDeliveryThresholdEgp;
  const amountLeft = Math.max(0, freeShipThreshold - cartSubtotal);

  const roleLine =
    resolvedRole === "owner" || resolvedRole === "admin"
      ? ar
        ? "📊 هل تريد ملخصاً سريعاً للأداء اليومي من لوحة الإدارة؟"
        : "📊 Want a quick performance snapshot from the admin dashboard?"
      : resolvedRole === "staff"
        ? ar
          ? "🧾 جاهز لمساعدتك في خطوات تجهيز الطلبات."
          : "🧾 Ready to help with order fulfillment steps."
        : ar
          ? "🤖 أنا هنا لاقتراح منتج أو مساعدتك في الاختيار."
          : "🤖 I'm here to suggest a product or help you choose.";

  const cartLine =
    cartItems > 0
      ? amountLeft > 0
        ? ar
          ? `🚚 تبقّى ${Math.round(amountLeft)} جنيه للوصول إلى الشحن المجاني.`
          : `🚚 ${Math.round(amountLeft)} EGP left to reach free delivery.`
        : ar
          ? "🎉 وصلت إلى حد الشحن المجاني — يمكنك إتمام الطلب الآن."
          : "🎉 You've reached free delivery — you can checkout now."
      : ar
        ? "🛍️ اسألني عن أفضل كوكيز للهدايا أو حسب ذوقك."
        : "🛍️ Ask me about the best cookies for gifts or your taste.";

  const dynamicChoices = ar
    ? [
        `🔥 من الأكثر طلباً الآن: ${pickName()} و ${pickName()}.`,
        `🎁 إن كنت تبحث عن هدية: جرّب ${pickName()}.`,
        `☕ مع القهوة يناسب غالباً ${pickName()}.`,
        roleLine,
        cartLine,
      ]
    : [
        `🔥 Trending now: ${pickName()} and ${pickName()}.`,
        `🎁 Looking for a gift? Try ${pickName()}.`,
        `☕ Pairs well with coffee: ${pickName()}.`,
        roleLine,
        cartLine,
      ];

  return pick(dynamicChoices);
}
