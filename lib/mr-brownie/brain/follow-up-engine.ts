import type { CommerceIntent } from "@/lib/mr-brownie/brain/intent-engine";

export function buildSmartFollowUps(intent: CommerceIntent, locale: "ar" | "en" | "auto"): string[] {
  const ar = locale !== "en";
  const map: Partial<Record<CommerceIntent, string[]>> = ar
    ? {
        gift_request: [
          "هل تريد أن أختار لك خياراً؟",
          "أم تفضّل خياراً أقل تكلفة؟",
          "نبدأ من /gift-box/build؟",
        ],
        fast_gift: ["صندوق جاهز أم مزيج سريع؟", "هل تريد بطاقة رسالة؟"],
        product_browse: ["أرشّح لك نكهتين؟", "قطعة واحدة أم صندوق 6 قطع؟"],
        budget: ["ما ميزانيتك التقريبية؟", "هل أركّز على العروض؟"],
        cart_help: ["أقترح إضافة قبل الدفع؟", "نكمل على /checkout؟"],
        complaint: ["هل لديك رقم الطلب؟", "هل توجد صور للمشكلة؟"],
        order_status: ["هل لديك رقم الطلب؟", "أفتح /track؟"],
        general: ["هدية أم منتج معيّن؟", "أساعدك في التوصيل؟"],
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

  return map[intent] ?? (ar ? ["هل تريد مساعدة في شيء آخر؟"] : ["Anything else I can help with?"]);
}
