import type { CommerceIntent } from "@/lib/mr-brownie/brain/intent-engine";

export function buildSmartFollowUps(intent: CommerceIntent, locale: "ar" | "en" | "auto"): string[] {
  const ar = locale !== "en";
  const map: Partial<Record<CommerceIntent, string[]>> = ar
    ? {
        gift_request: [
          "تحب أختار لك واحد؟",
          "ولا تفضل حاجة أرخص؟",
          "أجهزهولك دلوقتي من /gift-box/build؟",
        ],
        fast_gift: ["أجهز بوكس جاهز ولا ميكس سريع؟", "تحب أضيف كارت رسالة؟"],
        product_browse: ["تحب أرشح 2 نكهات؟", "قطعة ولا بوكس 6؟"],
        budget: ["ميزانيتك تقريباً كام؟", "تحب أركز على العروض؟"],
        cart_help: ["تحب أقترح إضافة قبل الدفع؟", "نكمّل على /checkout؟"],
        complaint: ["ممكن رقم الطلب؟", "في صور للمشكلة؟"],
        order_status: ["معاك رقم الطلب؟", "تحب أفتح /track؟"],
        general: ["تحب هدية ولا منتج معين؟", "أساعدك في التوصيل؟"],
      }
    : {
        gift_request: [
          "Want me to pick one for you?",
          "Prefer something more budget-friendly?",
          "Shall I set up /gift-box/build?",
        ],
        product_browse: ["Want 2 flavor picks?", "Single cookies or a 6-box?"],
        general: ["Gift box or a specific product?", "Need delivery info?"],
      };

  return map[intent] ?? (ar ? ["تحب أساعدك في إيه تاني؟"] : ["Anything else I can help with?"]);
}
