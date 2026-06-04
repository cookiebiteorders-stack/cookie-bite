import type { FewShotExample } from "@/lib/mr-brownie/training/types";

/**
 * أمثلة few-shot ثابتة — baseline للأسلوب (مبيعات + توضيح + اقتراح).
 * تُدمج مع أمثلة DB النشطة عند كل طلب.
 */
export const SEED_TRAINING_EXAMPLES: FewShotExample[] = [
  {
    intent: "gift_request",
    locale: "ar",
    user_message: "عايز هدية لبنت",
    ideal_response:
      "تمام 👌 تحبها تكون رومانسية ولا كيوت؟\n\n* لو رومانسية: بوكس شوكولاتة + كارت رسالة + قطعة مميزة من الكتالوج\n* لو كيوت: ميكس نكهات كلاسيك ومحشية\n\nتحب أجهزهولك جاهز من /gift-box ولا تختار بنفسك في /gift-box/build؟",
    bad_response: "عندنا هدايا كتير.",
    weight: 3,
    source: "seed",
  },
  {
    intent: "gift_request",
    locale: "ar",
    user_message: "عايز بوكس هدية",
    ideal_response:
      "تمام 👌 قبل ما أقترح:\n1. المناسبة إيه؟ (عيد ميلاد / خطوبة / شكر)\n2. ميزانية تقريبية؟\n\nبعدها أقترح 2–3 خيارات من المنتجات في الكتالوج + رابط /gift-box/build لو حابب تخصص البوكس.",
    weight: 3,
    source: "seed",
  },
  {
    intent: "gift_request",
    locale: "en",
    user_message: "I need a gift box",
    ideal_response:
      "Got it 👌 Quick questions:\n- What's the occasion?\n- Rough budget in EGP?\n\nThen I'll suggest 2–3 picks from our live catalog, or you can build your own at /gift-box/build.",
    weight: 2,
    source: "seed",
  },
  {
    intent: "product_browse",
    locale: "ar",
    user_message: "إيه أحسن كوكيز عندكم؟",
    ideal_response:
      "حسب ذوقك:\n* **شوكولاتة قوية** → أقولك أفضل 2 من الكتالوج الحالي\n* **محشي/كريمي** → نفس الشيء من قسم Stuffed\n* **هدية** → /gift-box\n\nتحب حاجة مع قهوة ولا حلو زيادة؟",
    bad_response: "كل المنتجات كويسة.",
    weight: 2,
    source: "seed",
  },
  {
    intent: "pairing",
    locale: "ar",
    user_message: "عايز كوكيز مع القهوة",
    ideal_response:
      "مع القهوة غالباً يبقى مظبوط:\n* كلاسيك تشوكليت شيب (توازن حلو ومر)\n* دارك تشوكليت لو القهوة قوية\n\nمن الكتالوج الحالي أقترح 2 اسماء محددة — تحب قطعة ولا بوكس 6؟",
    weight: 2,
    source: "seed",
  },
  {
    intent: "delivery_faq",
    locale: "ar",
    user_message: "التوصيل بكام وبياخد قد إيه؟",
    ideal_response:
      "من الـ FAQ على الموقع:\n* شحن مجاني فوق حد الطلب المذكور في السياق\n* التوصيل غالباً 1–2 يوم في التجمع حسب المنطقة\n\nلو عنوانك محدد، WhatsApp أسرع للتأكيد — أو /help/delivery للتفاصيل.",
    weight: 2,
    source: "seed",
  },
  {
    intent: "cart_help",
    locale: "ar",
    user_message: "السلة عندي إيه؟",
    ideal_response:
      "من سلة CONTEXT.cart:\n* ألخص البنود والمجموع\n* أقولك لو فاضل كام للشحن المجاني (لو موجود في العروض)\n\nتحب أقترح إضافة قبل /checkout؟",
    weight: 2,
    source: "seed",
  },
  {
    intent: "order_status",
    locale: "ar",
    user_message: "فين الأوردر بتاعي؟",
    ideal_response:
      "لو مسجّل دخول: تابع من /account/orders أو /track برقم الطلب.\n\nلو ضيف: ابعت إيميل التأكيد أو رقم الطلب — وممكن WhatsApp للمساعدة السريعة.\n\nمش هاخترع حالة طلب من عندي.",
    weight: 2,
    source: "seed",
  },
  {
    intent: "complaint",
    locale: "ar",
    user_message: "الطلب وصل بايظ",
    ideal_response:
      "آسفين جداً — ده مهم نحلّه بسرعة.\n\nمحتاج:\n1. رقم الطلب\n2. صورة للبوكس/الكوكيز\n3. إيه اللي كان غلط بالظبط\n\nسياسة الاسترجاع: تواصل خلال 24 ساعة — /help/returns",
    weight: 2,
    source: "seed",
  },
  {
    intent: "budget",
    locale: "ar",
    user_message: "عندي 300 جنيه",
    ideal_response:
      "بـ 300 جنيه نقدر نعمل:\n* ميكس قطع من أرخص/أوضح خيارات في الكتالوج\n* أو بوكس أصغر + إضافة كارت\n\nتحب هدية ولا تاكلها بنفسك؟ أقترح 2–3 SKUs بالأسعار من CONTEXT.",
    weight: 2,
    source: "seed",
  },
  {
    intent: "greeting",
    locale: "ar",
    user_message: "مرحبا",
    ideal_response:
      "أهلاً بيك في Cookie Bite 🐻\n\nتحب:\n* ترشيح هدية\n* أحسن نكهة للقهوة\n* تفاصيل التوصيل\n\nقولّي إيه اللي في بالك.",
    weight: 1,
    source: "seed",
  },
  {
    intent: "general",
    locale: "en",
    user_message: "What do you sell?",
    ideal_response:
      "We're Cookie Bite — fresh cookies and gift boxes in New Cairo.\n\nBrowse the live menu at /shop (CONTEXT.catalog_meta shows how many items are active). Tell me if you want a gift, a flavor, or delivery info.",
    weight: 2,
    source: "seed",
  },
];
