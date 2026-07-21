import type { CommerceIntent } from "@/lib/mr-brownie/brain/intent-engine";

export type ChatActionCard = {
  id: string;
  path: string;
  label_en: string;
  label_ar: string;
  icon: "package" | "help" | "cart" | "gift";
};

export function buildActionCardsForIntent(
  intent: CommerceIntent,
  locale: "ar" | "en" | "auto" = "auto",
): ChatActionCard[] {
  const ar = locale !== "en";

  if (intent === "order_status") {
    return [
      {
        id: "track",
        path: "/track",
        label_en: "Track my order",
        label_ar: "تتبّع طلبي",
        icon: "package",
      },
      {
        id: "account-orders",
        path: "/account/orders",
        label_en: "My orders",
        label_ar: "طلباتي",
        icon: "package",
      },
    ];
  }

  if (intent === "complaint") {
    return [
      {
        id: "help",
        path: "/help",
        label_en: "Help center",
        label_ar: "مركز المساعدة",
        icon: "help",
      },
      {
        id: "track",
        path: "/track",
        label_en: "Track order",
        label_ar: "تتبّع الطلب",
        icon: "package",
      },
    ];
  }

  if (intent === "promo_help") {
    return [
      {
        id: "checkout",
        path: "/cart",
        label_en: "Checkout with promo",
        label_ar: "الدفع مع الكوبون",
        icon: "cart",
      },
      {
        id: "cart",
        path: "/cart",
        label_en: "View cart",
        label_ar: "عرض السلة",
        icon: "cart",
      },
    ];
  }

  if (intent === "cart_help") {
    return [
      {
        id: "checkout",
        path: "/cart",
        label_en: "Go to checkout",
        label_ar: "إتمام الطلب",
        icon: "cart",
      },
      {
        id: "gift-box",
        path: "/gift-box/build",
        label_en: "Gift box builder",
        label_ar: "صانع صندوق الهدايا",
        icon: "gift",
      },
    ];
  }

  if (intent === "gift_request" || intent === "fast_gift") {
    return [
      {
        id: "gift-builder",
        path: "/gift-box/build",
        label_en: "Build a gift box",
        label_ar: "صمّم صندوق هدية",
        icon: "gift",
      },
      {
        id: "gift-curated",
        path: "/gift-box",
        label_en: "Ready-made boxes",
        label_ar: "صناديق جاهزة",
        icon: "gift",
      },
    ];
  }

  return ar
    ? []
    : [];
}

export function actionCardLabel(card: ChatActionCard, locale: "ar" | "en"): string {
  return locale === "ar" ? card.label_ar : card.label_en;
}
