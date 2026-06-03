import type { Lang } from "@/lib/i18n/translations";

export type PageSeoEntry = {
  title: string;
  description: string;
  keywords: string[];
};

export type LocalizedPageKey =
  | "/"
  | "/shop"
  | "/gift-box"
  | "/gift-box/build"
  | "/mystery-box"
  | "/delivery/new-cairo"
  | "/blog"
  | "/our-cookies"
  | "/our-story"
  | "/help/faq"
  | "/contact"
  | "/corporate-gifting"
  | "/privacy"
  | "/terms";

export const PAGE_METADATA: Record<LocalizedPageKey, Record<Lang, PageSeoEntry>> = {
  "/": {
    en: {
      title: "Cookie Delivery & Gift Boxes in New Cairo",
      description:
        "Order handcrafted cookies and premium gift boxes in New Cairo. Explore bestselling flavors, seasonal treats, and same-day support from Cookie Bite.",
      keywords: [
        "cookie delivery new cairo",
        "order cookies online egypt",
        "cookie gift box cairo",
        "fresh baked cookies",
        "cookie bite cairo",
      ],
    },
    ar: {
      title: "كوكي بايت 🍪 | قضمة واحدة تغيّر يومك — كوكيز وهدايا في القاهرة الجديدة",
      description:
        "كوكيز فاخرة مخبوزة بحب في التجمع الخامس. صمّم بوكس الهدية، اطلب أونلاين، واستمتع بتوصيل سريع — كل قضمة لحظة تستاهل.",
      keywords: [
        "كوكيز القاهرة الجديدة",
        "طلب كوكيز اونلاين مصر",
        "صناديق هدايا كوكيز",
        "كوكيز طازجة",
        "كوكي بايت",
        "كوكيز التجمع الخامس",
        "حلويات هدايا القاهرة",
      ],
    },
  },
  "/shop": {
    en: {
      title: "Shop Handcrafted Cookies Online — New Cairo",
      description:
        "Browse Cookie Bite flavors — classics, stuffed cookies, seasonal drops, and gift-ready treats. Filter by category, order fresh cookies online with delivery in New Cairo.",
      keywords: [
        "shop cookies cairo",
        "buy cookies online egypt",
        "order cookies new cairo",
        "cookie bite flavors",
        "handcrafted cookies fifth settlement",
        "cookie delivery cairo online",
      ],
    },
    ar: {
      title: "نكهاتنا — تسوّق الكوكيز | كوكي بايت القاهرة الجديدة",
      description:
        "كل كعكة اتصنعت علشان تعيش معاك لحظة. المتع الكلاسيكية، الإبداعات المرحة، والإصدارات المحدودة — اطلب أونلاين مع توصيل في التجمع الخامس.",
      keywords: [
        "تسوق كوكيز القاهرة الجديدة",
        "اشتري كوكيز اونلاين مصر",
        "طلب كوكيز التجمع الخامس",
        "نكهات كوكي بايت",
        "توصيل كوكيز القاهرة",
      ],
    },
  },
  "/gift-box": {
    en: {
      title: "Cookie Gift Boxes & Custom Builds in New Cairo",
      description:
        "Shop ready-made Cookie Bite gift boxes or build your own — pick treats, ribbon, wrap, and a message. Delivery in New Cairo for birthdays, Eid, and corporate gifting.",
      keywords: [
        "cookie gift box cairo",
        "build your own gift box",
        "custom cookie gift box egypt",
        "birthday cookie gifts new cairo",
        "corporate gift box egypt",
        "eid cookie gifts cairo",
      ],
    },
    ar: {
      title: "هدية بتحكي عنك — صناديق هدايا كوكي بايت",
      description:
        "علبة اختيار حر، كوليكشن جاهز، أو إصدار خاص بالمناسبات. رسالة بخط أنيق وموعد تسليم — ابدأ هديتك من كوكي بايت في القاهرة الجديدة.",
      keywords: [
        "صناديق هدايا كوكيز القاهرة",
        "صمّم صندوق هدايا",
        "هدايا عيد ميلاد بالكوكيز",
        "هدايا شركات مصر",
        "هدايا عيد كوكيز",
        "كوكيز هدايا التجمع الخامس",
      ],
    },
  },
  "/gift-box/build": {
    en: {
      title: "Build Your Own Cookie Gift Box — New Cairo",
      description:
        "Design a custom Cookie Bite gift box in 5 steps: choose size, add cookies and treats, personalize ribbon and message, preview in 3D, and order for delivery in New Cairo.",
      keywords: [
        "build cookie gift box",
        "custom dessert gift box cairo",
        "personalized cookie box egypt",
        "gift box builder cookie bite",
        "curated cookie box new cairo",
      ],
    },
    ar: {
      title: "صمّم صندوق هدايا الكوكيز — كوكي بايت | القاهرة الجديدة",
      description:
        "صمّم صندوق هديتك في 5 خطوات: اختر الحجم، أضف الكوكيز والحلويات، خصّص الشريطة والرسالة، شاهد المعاينة ثلاثية الأبعاد، واطلب التوصيل في القاهرة الجديدة.",
      keywords: [
        "صمّم صندوق هدايا كوكيز",
        "صندوق هدايا مخصص القاهرة",
        "بناء صندوق حلويات",
        "هدايا كوكيز التجمع الخامس",
        "تخصيص صندوق هدايا",
      ],
    },
  },
  "/mystery-box": {
    en: {
      title: "Mystery Cookie Gift Box — Curated for You",
      description:
        "Pick your occasion and budget — Cookie Bite builds a surprise gift box from our fresh cookies and treats. Perfect for birthdays, Ramadan, thank-you gifts, and corporate orders in New Cairo.",
      keywords: [
        "mystery gift box cookies",
        "surprise cookie box cairo",
        "curated dessert gift egypt",
        "cookie bite mystery box",
      ],
    },
    ar: {
      title: "صندوق المفاجأة — كوكي بايت | هدايا مخصصة",
      description:
        "اختر المناسبة والميزانية ونحن نختار لك تشكيلة كوكيز وهدايا من المخبز. مثالي لأعياد الميلاد ورمضان وشكر الشركاء في القاهرة الجديدة.",
      keywords: [
        "صندوق مفاجأة كوكيز",
        "هدية كوكيز مفاجأة",
        "تشكيلة هدايا القاهرة الجديدة",
        "كوكي بايت صندوق مفاجأة",
      ],
    },
  },
  "/delivery/new-cairo": {
    en: {
      title: "Cookie Delivery in New Cairo — Fifth Settlement",
      description:
        "Fresh Cookie Bite cookie and gift box delivery across New Cairo compounds. Free delivery over 500 EGP, small-batch baking, WhatsApp support from Fifth Settlement.",
      keywords: [
        "cookie delivery new cairo",
        "cookie delivery fifth settlement",
        "dessert delivery cairo egypt",
        "cookie bite delivery zones",
        "fresh cookies delivered new cairo",
      ],
    },
    ar: {
      title: "توصيل الكوكيز في القاهرة الجديدة | كوكي بايت",
      description:
        "توصيل كوكيز وصناديق هدايا كوكي بايت الطازجة في التجمع الخامس والكمبوندات. توصيل مجاني للطلبات المؤهلة، خبز على دفعات صغيرة، دعم واتساب.",
      keywords: [
        "توصيل كوكيز القاهرة الجديدة",
        "توصيل حلويات التجمع الخامس",
        "توصيل كوكي بايت",
        "طلب كوكيز بالتوصيل القاهرة",
      ],
    },
  },
  "/blog": {
    en: {
      title: "Cookie Blog — Gifting Tips & New Cairo Dessert Guides",
      description:
        "Cookie Bite blog: cookie gifting ideas, seasonal flavor guides, celebration planning, and kitchen updates from New Cairo. Practical tips for ordering and gifting.",
      keywords: [
        "cookie blog cairo",
        "cookie gift ideas egypt",
        "dessert tips new cairo",
        "cookie gifting guide",
        "cookie bite blog",
      ],
    },
    ar: {
      title: "مدونة كوكي بايت — أفكار الهدايا ودلائل الكوكيز",
      description:
        "مدونة كوكي بايت: أفكار هدايا بالكوكيز، دلائل النكهات الموسمية، تخطيط الاحتفالات، وتحديثات من مطبخنا في القاهرة الجديدة.",
      keywords: [
        "مدونة كوكيز القاهرة",
        "أفكار هدايا كوكيز",
        "نصائح حلويات مصر",
        "دليل هدايا الكوكيز",
      ],
    },
  },
  "/our-cookies": {
    en: {
      title: "Our Cookie Flavors & Collections — New Cairo",
      description:
        "Explore Cookie Bite flavor collections — classics, chocolate lovers, stuffed cookies, premium specials, and seasonal drops. Handcrafted in Fifth Settlement with delivery in New Cairo.",
      keywords: [
        "cookie flavors cairo",
        "cookie menu egypt",
        "artisan cookies new cairo",
        "cookie bite collections",
        "seasonal cookies fifth settlement",
      ],
    },
    ar: {
      title: "نكهاتنا ومجموعات الكوكيز | كوكي بايت — القاهرة الجديدة",
      description:
        "اكتشف مجموعات كوكي بايت — كلاسيكيات، عشاق الشوكولاتة، محشية، فاخرة، وموسمية. مخبوزة يدوياً في التجمع الخامس مع توصيل في القاهرة الجديدة.",
      keywords: [
        "نكهات كوكيز القاهرة",
        "قائمة كوكيز مصر",
        "كوكيز التجمع الخامس",
        "مجموعات كوكي بايت",
      ],
    },
  },
  "/our-story": {
    en: {
      title: "Our Story",
      description:
        "Read the Cookie Bite story and discover how our New Cairo kitchen crafts cookies, gift boxes, and memorable moments.",
      keywords: [
        "cookie bite story",
        "new cairo bakery story",
        "handcrafted cookies egypt",
        "about cookie bite",
      ],
    },
    ar: {
      title: "من إحنا | كوكي بايت — مش بس حلوى. لحظة.",
      description:
        "Cookie Bite اتبنت على فكرة بسيطة: الكعكة الكويسة حق مش رفاهية. مكونات بتفرق، فخامة دافئة، وعلاقة حقيقية مع عملائنا في القاهرة الجديدة.",
      keywords: [
        "قصة كوكي بايت",
        "مخبوزات يدوية القاهرة الجديدة",
        "كوكيز التجمع الخامس",
      ],
    },
  },
  "/help/faq": {
    en: {
      title: "FAQ — Delivery, Orders & Gifting",
      description:
        "Quick answers about Cookie Bite delivery in New Cairo, freshness, payments, allergens, and gift options.",
      keywords: [
        "cookie bite faq",
        "cookie delivery faq cairo",
        "cookie gift faq egypt",
      ],
    },
    ar: {
      title: "الأسئلة الشائعة — التوصيل والطلبات والهدايا | كوكي بايت",
      description:
        "إجابات سريعة عن مناطق التوصيل في القاهرة الجديدة، طازجية الكوكيز، طرق الدفع، مسببات الحساسية، وتتبع الطلبات.",
      keywords: [
        "أسئلة كوكي بايت",
        "توصيل كوكيز القاهرة الجديدة",
        "طلب كوكيز اونلاين",
      ],
    },
  },
  "/contact": {
    en: {
      title: "Contact Cookie Bite New Cairo",
      description:
        "Contact Cookie Bite for custom cookie orders, gifting support, wholesale, and delivery help in New Cairo.",
      keywords: [
        "contact cookie bite",
        "cookie bite support",
        "cookie delivery support cairo",
        "custom cookie order egypt",
      ],
    },
    ar: {
      title: "إحنا هنا | تواصل مع كوكي بايت",
      description:
        "سؤال؟ طلب خاص؟ أو عايز تقول إن الكعكة كانت تحفة؟ راسلنا على hello@cookie-bite.com أو واتساب — كل ده بيسعدنا.",
      keywords: [
        "تواصل كوكي بايت",
        "طلب كوكيز مخصص القاهرة",
        "هدايا شركات كوكيز",
      ],
    },
  },
  "/corporate-gifting": {
    en: {
      title: "Corporate Cookie Gifting in Egypt",
      description:
        "Corporate and bulk cookie gift orders from Cookie Bite — branded packaging, event favors, and team gifts in New Cairo and beyond.",
      keywords: [
        "corporate cookie gifts egypt",
        "bulk cookie orders cairo",
        "branded cookie boxes",
        "office gifting desserts",
      ],
    },
    ar: {
      title: "هدايا الشركات والكميات الكبيرة | كوكي بايت مصر",
      description:
        "صناديق كوكيز للشركات بتغليف مميز وعلامة تجارية خاصة. هدايا فرق العمل والعملاء في القاهرة الجديدة.",
      keywords: [
        "هدايا شركات مصر",
        "طلبات كوكيز بالجملة",
        "صناديق هدايا بالعلامة التجارية",
        "هدايا فرق عمل القاهرة",
        "هدايا مناسبات شركات",
      ],
    },
  },
  "/privacy": {
    en: {
      title: "Privacy Policy",
      description:
        "How Cookie Bite collects, stores, and protects your order and account data — plain language privacy policy.",
      keywords: [
        "cookie bite privacy policy",
        "data protection bakery website",
        "customer data privacy egypt",
      ],
    },
    ar: {
      title: "سياسة الخصوصية | كوكي بايت",
      description:
        "إزاي كوكي بايت بتجمع وتحمي بيانات طلباتك وحسابك — بلغة واضحة من غير تعقيد.",
      keywords: [
        "سياسة الخصوصية كوكي بايت",
        "حماية البيانات مصر",
        "خصوصية طلبات اونلاين",
      ],
    },
  },
  "/terms": {
    en: {
      title: "Terms & Conditions",
      description:
        "Cookie Bite terms for using the site, placing orders, pricing in EGP, and delivery policies.",
      keywords: [
        "cookie bite terms",
        "website terms and conditions egypt",
        "online order terms",
      ],
    },
    ar: {
      title: "الشروط والأحكام | كوكي بايت",
      description:
        "شروط استخدام موقع كوكي بايت، الطلب، الأسعار بالجنيه، وسياسات التوصيل.",
      keywords: [
        "شروط الاستخدام كوكي بايت",
        "شروط الطلب اونلاين مصر",
        "سياسة التوصيل كوكيز",
      ],
    },
  },
};
