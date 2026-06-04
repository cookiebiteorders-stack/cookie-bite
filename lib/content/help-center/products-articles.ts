import type { HelpCenterArticle } from "@/lib/content/help-center/types";

export const PRODUCTS_HELP_ARTICLES: HelpCenterArticle[] = [
  {
    id: "p1",
    categoryId: "products",
    icon: "🌾",
    readTime: { ar: "دقيقتان", en: "2 min read" },
    title: { ar: "ما هي مكونات المنتجات؟", en: "What are your product ingredients?" },
    description: {
      ar: "معلومات تفصيلية عن مكونات البراونيز والكوكيز.",
      en: "Detailed ingredients for brownies and cookies.",
    },
    preview: {
      ar: "معلومات تفصيلية عن مكونات البراونيز والكوكيز.",
      en: "Brownie and cookie ingredients.",
    },
    blocks: {
      ar: [
        {
          paragraphs: [
            "نؤمن بالشفافية الكاملة فيما يخص المكونات. هنا قائمة بالمكونات الرئيسية لمنتجاتنا.",
          ],
        },
        {
          heading: "البراونيز",
          list: [
            "شوكولاتة بلجيكية داكنة (70% كاكاو).",
            "كاكاو فرنسي عالي الجودة.",
            "زبدة طازجة.",
            "سكر، بيض طازج، دقيق.",
            "خلاصة الفانيليا الطبيعية.",
          ],
        },
        {
          heading: "الكوكيز",
          list: [
            "دقيق، سكر بني وأبيض، زبدة.",
            "بيض طازج، بيكنج صودا.",
            "حشوات متنوعة: شوكولاتة، لوتس، نوتيلا، بيانكي، كراميل.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ تحذير الحساسية: جميع منتجاتنا تُصنع في مطبخ يحتوي على مكسرات، قمح، بيض، ومشتقات الحليب. إذا كان لديك حساسية، تواصل معنا قبل الطلب.",
          },
        },
        {
          heading: "هل تستخدمون مواد حافظة؟",
          paragraphs: [
            "لا! جميع منتجاتنا طبيعية 100% بدون مواد حافظة أو نكهات صناعية. لهذا طعمها مميز — ولهذا صلاحيتها أقصر.",
          ],
        },
      ],
      en: [
        {
          paragraphs: [
            "We believe in full transparency on ingredients. Here are the main ingredients in our products.",
          ],
        },
        {
          heading: "Brownies",
          list: [
            "Belgian dark chocolate (70% cocoa).",
            "High-quality French cocoa.",
            "Fresh butter.",
            "Sugar, fresh eggs, flour.",
            "Natural vanilla extract.",
          ],
        },
        {
          heading: "Cookies",
          list: [
            "Flour, brown and white sugar, butter.",
            "Fresh eggs, baking soda.",
            "Fillings: chocolate, Lotus, Nutella, Bianco, caramel, and more.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ Allergy warning: all products are made in a kitchen that handles nuts, wheat, eggs, and dairy. Contact us before ordering if you have allergies.",
          },
        },
        {
          heading: "Do you use preservatives?",
          paragraphs: [
            "No. Everything is 100% natural with no preservatives or artificial flavors — which is why they taste great and have a shorter shelf life.",
          ],
        },
      ],
    },
    relatedLinks: [
      { href: "/help/articles/p2", label: { ar: "الحساسية", en: "Allergens" } },
      { href: "/shop", label: { ar: "المتجر", en: "Shop" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
      { href: "/help", label: { ar: "مركز المساعدة", en: "Help center" } },
    ],
  },
  {
    id: "p2",
    categoryId: "products",
    icon: "⚠️",
    readTime: { ar: "دقيقتان", en: "2 min read" },
    title: { ar: "هل منتجاتكم مناسبة لمن لديه حساسية؟", en: "Are your products safe for allergies?" },
    description: {
      ar: "معلومات الحساسية والمواد المسببة لها في منتجاتنا.",
      en: "Allergen information for our products.",
    },
    preview: {
      ar: "معلومات الحساسية والمواد المسببة لها في منتجاتنا.",
      en: "Allergen information.",
    },
    blocks: {
      ar: [
        {
          paragraphs: ["صحتك أهم شيء. إليك كل ما تحتاج معرفته عن الحساسية في منتجاتنا."],
        },
        {
          heading: "المواد المسببة للحساسية في منتجاتنا",
          list: [
            "🌾 الجلوتين/القمح: موجود في جميع المنتجات.",
            "🥛 الحليب ومشتقاته: موجود (زبدة، شوكولاتة بالحليب).",
            "🥚 البيض: موجود في جميع المنتجات.",
            "🥜 المكسرات: قد تكون موجودة في بعض النكهات.",
            "🌱 الصويا: موجودة في بعض أنواع الشوكولاتة.",
          ],
        },
        {
          heading: "هل لديكم خيارات خالية من الجلوتين؟",
          paragraphs: [
            "حالياً نعمل على تطوير خط منتجات خالٍ من الجلوتين. انضم إلى قائمة الانتظار عبر تواصلنا معنا.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ مهم جداً: حتى لو لم يكن المنتج يحتوي على مادة بعينها في مكوناته، فإن مطبخنا يتعامل مع جميع هذه المواد. لذا لا يمكننا ضمان خلو أي منتج من التلوث المتقاطع لأصحاب الحساسية الحادة.",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "Your health comes first. Here is what you need to know about allergens in our products.",
          ],
        },
        {
          heading: "Allergens in our range",
          list: [
            "🌾 Gluten/wheat: present in all products.",
            "🥛 Milk and dairy: present (butter, milk chocolate).",
            "🥚 Egg: present in all products.",
            "🥜 Nuts: may be present in some flavors.",
            "🌱 Soy: present in some chocolate types.",
          ],
        },
        {
          heading: "Gluten-free options?",
          paragraphs: [
            "We are developing a gluten-free line. Join the waitlist by contacting us.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ Important: even if an ingredient is not listed, our kitchen handles all of these allergens. We cannot guarantee zero cross-contamination for severe allergies.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/help/articles/p1", label: { ar: "المكونات", en: "Ingredients" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
      { href: "/shop", label: { ar: "المتجر", en: "Shop" } },
      { href: "/help/articles/p3", label: { ar: "التخزين", en: "Storage" } },
    ],
  },
  {
    id: "p3",
    categoryId: "products",
    icon: "🧊",
    readTime: { ar: "دقيقتان", en: "2 min read" },
    title: { ar: "كيف أحفظ المنتجات للحفاظ على طزاجتها؟", en: "How should I store products for freshness?" },
    description: {
      ar: "أفضل طريقة لتخزين البراونيز والكوكيز للحصول على أفضل طعم.",
      en: "Best storage for brownies and cookies.",
    },
    preview: {
      ar: "أفضل طريقة لتخزين البراونيز والكوكيز للحصول على أفضل طعم.",
      en: "Storage tips for best taste.",
    },
    blocks: {
      ar: [
        {
          paragraphs: [
            "منتجاتنا تُخبز طازجة يومياً، وطريقة التخزين الصحيحة ستحافظ على طعمها المميز.",
          ],
        },
        {
          heading: "البراونيز",
          list: [
            "درجة الحرارة: في درجة حرارة الغرفة (أقل من 25°م) في وعاء محكم الإغلاق — تدوم حتى 3 أيام.",
            "الثلاجة: تدوم حتى 7 أيام. أخرجها قبل 20 دقيقة من الأكل للحصول على القوام الأمثل.",
            "الفريزر: تدوم حتى شهر واحد. ذوّبيها في درجة الحرارة العادية.",
          ],
        },
        {
          heading: "الكوكيز",
          list: [
            "درجة الحرارة العادية: في وعاء محكم بعيداً عن الرطوبة — حتى 4 أيام.",
            "الثلاجة: تدوم حتى 10 أيام، لكن قد يصبح القوام أقل هشاشة.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "🔥 نصيحة: سخّن الكوكيز في الميكروويف 10 ثوانٍ قبل الأكل — ستتذوّق نفس طعم ما خرج من الفرن!",
          },
        },
        {
          heading: "ماذا لو انتهت مدة الصلاحية؟",
          paragraphs: [
            "لا نتهاون في هذا. إذا شعرت بأي تغيير في الطعم أو الرائحة، توقف عن الأكل وتواصل معنا.",
          ],
        },
      ],
      en: [
        {
          paragraphs: [
            "Our products are baked fresh daily. Proper storage keeps the taste at its best.",
          ],
        },
        {
          heading: "Brownies",
          list: [
            "Room temperature (below 25°C) in an airtight container — up to 3 days.",
            "Fridge — up to 7 days. Let sit 20 minutes before eating for ideal texture.",
            "Freezer — up to one month. Thaw at room temperature.",
          ],
        },
        {
          heading: "Cookies",
          list: [
            "Room temperature in an airtight container away from humidity — up to 4 days.",
            "Fridge — up to 10 days, but they may be less crisp.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "🔥 Tip: microwave cookies for 10 seconds before eating — almost like fresh from the oven.",
          },
        },
        {
          heading: "Past shelf life?",
          paragraphs: [
            "We take this seriously. If taste or smell seems off, stop eating and contact us.",
          ],
        },
      ],
    },
    relatedLinks: [
      { href: "/help/articles/p4", label: { ar: "مدة الصلاحية", en: "Shelf life" } },
      { href: "/help/articles/p1", label: { ar: "المكونات", en: "Ingredients" } },
      { href: "/shop", label: { ar: "المتجر", en: "Shop" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
    ],
  },
  {
    id: "p4",
    categoryId: "products",
    icon: "📅",
    readTime: { ar: "دقيقة", en: "1 min read" },
    title: { ar: "ما هي مدة صلاحية المنتجات؟", en: "What is the shelf life of your products?" },
    description: {
      ar: "مدة صلاحية كل منتج من تاريخ الخبز وكيفية التحقق منها.",
      en: "Shelf life by product and how to check bake dates.",
    },
    preview: {
      ar: "مدة صلاحية كل منتج من تاريخ الخبز وكيفية التحقق منها.",
      en: "Shelf life by product.",
    },
    blocks: {
      ar: [
        {
          paragraphs: [
            "جميع منتجاتنا تُخبز في نفس يوم التوصيل أو اليوم السابق له كحد أقصى.",
          ],
        },
        {
          heading: "مدة الصلاحية لكل منتج",
          list: [
            "🍫 براونيز فردية: 3 أيام في الغرفة، 7 أيام في الثلاجة.",
            "📦 صندوق براونيز: 3 أيام في الغرفة، 7 أيام في الثلاجة.",
            "🍪 كوكيز: 4 أيام في الغرفة، 10 أيام في الثلاجة.",
            "🎂 الكوكيز المخصصة (مرسومة): 5 أيام في الغرفة.",
          ],
        },
        {
          heading: "كيف أتحقق من تاريخ الخبز؟",
          paragraphs: [
            "ستجد ملصقاً داخل كل علبة يوضح تاريخ الخبز وتاريخ انتهاء الصلاحية الموصى به.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ مهم: مدد الصلاحية مبنية على التخزين الصحيح. الحرارة الشديدة أو الرطوبة قد تقلل من هذه المدة.",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "All products are baked on your delivery day or at most the day before.",
          ],
        },
        {
          heading: "Shelf life by product",
          list: [
            "🍫 Single brownies: 3 days at room temperature, 7 in the fridge.",
            "📦 Brownie boxes: 3 days at room temperature, 7 in the fridge.",
            "🍪 Cookies: 4 days at room temperature, 10 in the fridge.",
            "🎂 Custom printed cookies: 5 days at room temperature.",
          ],
        },
        {
          heading: "How to check the bake date",
          paragraphs: [
            "Each box includes a label with the bake date and recommended use-by date.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ Important: these periods assume proper storage. Heat or humidity can shorten shelf life.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/help/articles/p3", label: { ar: "التخزين", en: "Storage" } },
      { href: "/shop", label: { ar: "المتجر", en: "Shop" } },
      { href: "/help/articles/g4", label: { ar: "كوكيز مخصصة", en: "Custom cookies" } },
      { href: "/help", label: { ar: "مركز المساعدة", en: "Help center" } },
    ],
  },
];
