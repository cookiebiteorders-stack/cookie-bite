import type { FewShotExample } from "@/lib/mr-brownie/training/types";

/**
 * أمثلة few-shot ثابتة — baseline للأسلوب (مبيعات + توضيح + اقتراح).
 * تُدمج مع أمثلة DB النشطة عند كل طلب.
 */
export const SEED_TRAINING_EXAMPLES: FewShotExample[] = [
  {
    intent: "gift_request",
    locale: "ar",
    user_message: "أريد هدية لصديقة",
    ideal_response:
      "بكل سرور 👌 لأي مناسبة؟ (عيد ميلاد / شكر / احتفال)\n\n* للاحتفال: صندوق شوكولاتة + بطاقة رسالة + قطعة مميزة من الكتالوج\n* للتنويع: مزيج كلاسيك ومحشي\n\nهل تفضّل صندوقاً جاهزاً من /gift-box أم التخصيص في /gift-box/build؟",
    bad_response: "عندنا هدايا كتير.",
    weight: 3,
    source: "seed",
  },
  {
    intent: "gift_request",
    locale: "ar",
    user_message: "أريد صندوق هدية",
    ideal_response:
      "بكل سرور 👌 قبل الاقتراح:\n1. ما المناسبة؟ (عيد ميلاد / خطوبة / شكر)\n2. ما الميزانية التقريبية؟\n\nبعدها أقترح 2–3 خيارات من الكتالوج + رابط /gift-box/build للتخصيص.",
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
    user_message: "ما أفضل كوكيز لديكم؟",
    ideal_response:
      "حسب ذوقك:\n* **شوكولاتة قوية** → أفضل خيارين من الكتالوج الحالي\n* **محشي/كريمي** → من قسم Stuffed\n* **هدية** → /gift-box\n\nهل تفضّلها مع قهوة أم نكهة أحلى؟",
    bad_response: "كل المنتجات جيدة.",
    weight: 2,
    source: "seed",
  },
  {
    intent: "pairing",
    locale: "ar",
    user_message: "أريد كوكيز مع القهوة",
    ideal_response:
      "مع القهوة يناسب غالباً:\n* كلاسيك تشوكليت شيب (توازن حلو ومر)\n* دارك تشوكليت إن كانت القهوة قوية\n\nمن الكتالوج أقترح اسمين محددين — هل تفضّل قطعة واحدة أم صندوق 6 قطع؟",
    weight: 2,
    source: "seed",
  },
  {
    intent: "delivery_faq",
    locale: "ar",
    user_message: "كم التوصيل وكم يستغرق؟",
    ideal_response:
      "من الأسئلة الشائعة على الموقع:\n* شحن مجاني فوق حد الطلب المذكور في السياق\n* التوصيل غالباً 1–2 يوم عمل في التجمع حسب المنطقة\n\nإن كان عنوانك محدداً، واتساب أسرع للتأكيد — أو /help/delivery للتفاصيل.",
    weight: 2,
    source: "seed",
  },
  {
    intent: "cart_help",
    locale: "ar",
    user_message: "السلة عندي إيه؟",
    ideal_response:
      "من سلة CONTEXT.cart:\n* ألخّص البنود والمجموع\n* أذكر ما تبقّى للشحن المجاني (إن وُجد في العروض)\n\nهل تريد اقتراح إضافة قبل /checkout؟",
    weight: 2,
    source: "seed",
  },
  {
    intent: "order_status",
    locale: "ar",
    user_message: "أين طلبي؟",
    ideal_response:
      "إن كنت مسجّل الدخول: تابع من /account/orders أو /track برقم الطلب.\n\nإن كنت ضيفاً: أرسل بريد التأكيد أو رقم الطلب — أو واتساب للمساعدة السريعة.\n\nلن أختلق حالة طلب من عندي.",
    weight: 2,
    source: "seed",
  },
  {
    intent: "complaint",
    locale: "ar",
    user_message: "الطلب وصل تالفاً",
    ideal_response:
      "نعتذر بصدق — هذا مهم ونريد حله بسرعة.\n\nنحتاج:\n1. رقم الطلب\n2. صورة للصندوق/الكوكيز\n3. وصف المشكلة بدقة\n\nسياسة الاسترجاع: تواصل خلال 24 ساعة — /help/returns",
    weight: 2,
    source: "seed",
  },
  {
    intent: "budget",
    locale: "ar",
    user_message: "ميزانيتي 300 جنيه",
    ideal_response:
      "بميزانية 300 جنيه يمكن:\n* مزيج قطع من أوضح خيارات الكتالوج\n* أو صندوق أصغر + بطاقة رسالة\n\nهل الهدف إهداء أم للاستمتاع الشخصي؟ أقترح 2–3 منتجات بالأسعار من CONTEXT.",
    weight: 2,
    source: "seed",
  },
  {
    intent: "greeting",
    locale: "ar",
    user_message: "مرحبا",
    ideal_response:
      "أهلاً بك في Cookie Bite 🐻\n\nهل تريد:\n* اقتراح هدية\n* نكهة مناسبة للقهوة\n* تفاصيل التوصيل\n\nأخبرني بما تبحث عنه.",
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
