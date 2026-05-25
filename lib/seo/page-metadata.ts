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
  | "/our-story"
  | "/help/faq"
  | "/contact"
  | "/corporate-gifting";

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
      title: "كوكي بايت | كوكيز طازجة وصناديق هدايا في القاهرة الجديدة",
      description:
        "اطلب كوكيز مصنوعة يدويًا وصناديق هدايا فاخرة في القاهرة الجديدة. زبدة حقيقية، شوكولاتة بلجيكية، وتوصيل سريع. اطلب الآن من كوكي بايت.",
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
      title: "Shop Cookies in New Cairo",
      description:
        "Browse Cookie Bite flavors, compare prices, and order fresh handcrafted cookies online in New Cairo.",
      keywords: [
        "shop cookies cairo",
        "buy cookies online egypt",
        "new cairo bakery shop",
        "cookie bite flavors",
      ],
    },
    ar: {
      title: "تسوّق الكوكيز | كوكي بايت — القاهرة الجديدة",
      description:
        "اكتشف جميع نكهات كوكيز كوكي بايت في القاهرة الجديدة. اطلب كوكيزك المفضلة أونلاين بأسعار واضحة وتوصيل طازج.",
      keywords: [
        "تسوق كوكيز القاهرة الجديدة",
        "اشتري كوكيز اونلاين مصر",
        "نكهات كوكيز كوكي بايت",
        "مخبوزات القاهرة الجديدة",
        "كوكيز طازجة بالتوصيل",
      ],
    },
  },
  "/gift-box": {
    en: {
      title: "Cookie Gift Boxes in New Cairo",
      description:
        "Explore premium Cookie Bite gift boxes for birthdays, corporate gifting, and celebrations in New Cairo.",
      keywords: [
        "cookie gift box cairo",
        "birthday cookie gifts",
        "corporate gift box egypt",
        "premium dessert gifts",
      ],
    },
    ar: {
      title: "صناديق هدايا الكوكيز | كوكي بايت — القاهرة الجديدة",
      description:
        "صناديق هدايا كوكيز فاخرة لأعياد الميلاد والمناسبات وهدايا الشركات في القاهرة الجديدة. تغليف احترافي وبطاقة هدية بخط اليد.",
      keywords: [
        "صناديق هدايا كوكيز القاهرة",
        "هدايا عيد ميلاد بالكوكيز",
        "هدايا شركات مصر",
        "هدايا حلويات فاخرة القاهرة الجديدة",
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
      title: "قصتنا | كوكي بايت — مخبوز بحب من القاهرة الجديدة",
      description:
        "اعرف قصة كوكي بايت وكيف بدأنا بمطبخ صغير وحب كبير للكوكيز الحقيقية. نخبز بمكونات طبيعية في التجمع الخامس، القاهرة الجديدة.",
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
      title: "تواصل معنا | كوكي بايت — القاهرة الجديدة",
      description:
        "تواصل مع كوكي بايت لطلب كوكيز مخصصة، هدايا الشركات، ودعم التوصيل في القاهرة الجديدة. نردّ خلال يوم عمل واحد.",
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
};
