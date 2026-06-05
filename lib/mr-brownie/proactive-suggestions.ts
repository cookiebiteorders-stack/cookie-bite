import type { CartLine } from "@/lib/cart/types";
import type { MrBrowniePageIntent } from "@/lib/mr-brownie/page-intent";
import type { SeasonalChatContext } from "@/lib/mr-brownie/seasonal-context";
import { detectGiftOccasion } from "@/lib/mr-brownie/gift-occasion";

export function buildProactiveSuggestions(params: {
  locale: "ar" | "en" | "auto";
  pageIntent: MrBrowniePageIntent;
  pathname: string;
  cartLines: CartLine[];
  seasonal: SeasonalChatContext;
  lastUserMessage?: string;
}): string[] {
  const ar = params.locale !== "en";
  const occasion = detectGiftOccasion(params.lastUserMessage ?? "");

  if (
    params.pageIntent === "gift_box" ||
    params.pathname.includes("/gift-box/build")
  ) {
    return ar
      ? ["نكمل صندوق الهدية؟", "إضافة بطاقة رسالة؟", "معاينة الصندوق قبل الدفع؟"]
      : [
          "Continue your gift box?",
          "Add a message card?",
          "Preview box before checkout?",
        ];
  }

  if (occasion) {
    return ar
      ? [
          `أفكار هدايا لـ${occasion.label_ar}؟`,
          "صندوق هدايا جاهز أم مخصص؟",
          "ما الميزانية التقريبية؟",
        ]
      : [
          `Gift ideas for ${occasion.label_en}?`,
          "Ready-made or custom gift box?",
          "What's your budget?",
        ];
  }

  if (params.cartLines.length > 0) {
    return ar
      ? ["مراجعة السلة قبل الدفع؟", "إضافة بطاقة رسالة؟", "متى يصل التوصيل؟"]
      : ["Review cart before checkout?", "Add a message card?", "When is delivery?"];
  }

  if (params.pageIntent === "product_detail" || params.pageIntent === "shop") {
    return ar
      ? ["هل يناسب كهدية؟", "نكهات مشابهة؟", "متى التوصيل مجاني؟"]
      : ["Good as a gift?", "Similar flavors?", "When is delivery free?"];
  }

  if (params.seasonal.season_id !== "default") {
    const label = ar ? params.seasonal.label_ar : params.seasonal.label_en;
    return ar
      ? [`عروض ${label}؟`, "صندوق هدايا للعائلة؟", "أشهر المنتجات الآن؟"]
      : [`${label} offers?`, "Family gift box?", "What's popular now?"];
  }

  return ar
    ? ["رشّح لي هدية 🎁", "أشهر الكوكيز؟", "متى التوصيل مجاني؟"]
    : ["Recommend a gift 🎁", "Bestsellers?", "When is delivery free?"];
}
