import type { HelpCenterArticle } from "@/lib/content/help-center/types";

export const GIFTING_HELP_ARTICLES: HelpCenterArticle[] = [
  {
    id: "g1",
    categoryId: "gifting",
    icon: "💌",
    readTime: { ar: "دقيقة", en: "1 min read" },
    title: { ar: "كيف أضيف رسالة هدية مكتوبة بخط اليد؟", en: "How do I add a handwritten gift message?" },
    description: {
      ar: "إضافة بطاقة مكتوبة بخط اليد مع طلبك كهدية مميزة.",
      en: "Add a handwritten card to make your order a special gift.",
    },
    preview: {
      ar: "إضافة بطاقة مكتوبة بخط اليد مع طلبك كهدية مميزة.",
      en: "Add a handwritten gift card.",
    },
    blocks: {
      ar: [
        {
          paragraphs: [
            "نحب أن نجعل كل هدية مميزة! يمكنك إضافة رسالة شخصية مكتوبة بخط اليد مع أي طلب.",
          ],
        },
        {
          heading: "كيف أضيف الرسالة؟",
          steps: [
            "أضف المنتجات التي تريدها إلى السلة.",
            "في صفحة إتمام الطلب، ابحث عن خيار «إضافة رسالة هدية».",
            "فعّل الخيار وأدخل نص رسالتك (حتى 200 حرف).",
            "أكمل إتمام الطلب.",
          ],
        },
        {
          heading: "تفاصيل مهمة",
          list: [
            "الرسالة مكتوبة بخط اليد على بطاقة مميزة بشعار Cookie Bite.",
            "الخدمة مجانية تماماً.",
            "يمكنك الكتابة بالعربية أو الإنجليزية.",
            "لن يظهر سعر المنتجات داخل العبوة إذا فعّلت خيار الهدية.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "🎀 نصيحة: اطلب «تغليف هدية» إضافةً لجعل العبوة أجمل بشريطة ورقية ملونة.",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "We love making every gift special. You can add a personal handwritten message to any order.",
          ],
        },
        {
          heading: "How to add a message",
          steps: [
            "Add the products you want to your cart.",
            "At checkout, find the Add gift message option.",
            "Enable it and enter your message (up to 200 characters).",
            "Complete checkout.",
          ],
        },
        {
          heading: "Good to know",
          list: [
            "Messages are handwritten on a branded Cookie Bite card.",
            "The service is completely free.",
            "Arabic or English is fine.",
            "Product prices are hidden inside the box when gift mode is enabled.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "🎀 Tip: add gift wrapping for a ribbon finish on the box.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/shop", label: { ar: "المتجر", en: "Shop" } },
      { href: "/help/articles/g2", label: { ar: "تغليف الهدايا", en: "Gift wrapping" } },
      { href: "/gift-box", label: { ar: "صناديق الهدايا", en: "Gift boxes" } },
      { href: "/help", label: { ar: "مركز المساعدة", en: "Help center" } },
    ],
  },
  {
    id: "g2",
    categoryId: "gifting",
    icon: "🎀",
    readTime: { ar: "دقيقة", en: "1 min read" },
    title: { ar: "هل يمكنني طلب تغليف هدية خاص؟", en: "Can I request special gift wrapping?" },
    description: {
      ar: "خيارات تغليف الهدايا المتاحة وكيفية اختيارها.",
      en: "Gift wrapping options and how to choose them.",
    },
    preview: {
      ar: "خيارات تغليف الهدايا المتاحة وكيفية اختيارها.",
      en: "Gift wrapping options.",
    },
    blocks: {
      ar: [
        {
          paragraphs: ["بالطبع! لدينا خيارات تغليف رائعة تجعل هديتك لا تُنسى."],
        },
        {
          heading: "خيارات التغليف المتاحة",
          list: [
            "تغليف قياسي: علبة مزخرفة بألوان Cookie Bite — مجاناً.",
            "تغليف فاخر: علبة هدايا مزخرفة مع شريطة ساتان — مقابل 30 ج.م.",
            "تغليف حفلات: تصميم خاص لأعياد الميلاد والمناسبات — مقابل 45 ج.م.",
          ],
        },
        {
          heading: "كيف أختار التغليف؟",
          steps: [
            "في سلة التسوق أو صفحة الدفع، اختر «خيارات الهدية».",
            "اختر نوع التغليف الذي تفضله.",
            "أكمل الطلب.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "📸 للمناسبات الكبيرة: تواصل معنا مسبقاً إن كان لديك تصور معيّن — يسعدنا مساعدتك في تصميم هدية مميزة.",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "Absolutely. We offer wrapping options that make your gift unforgettable.",
          ],
        },
        {
          heading: "Available wrapping",
          list: [
            "Standard: branded Cookie Bite box — free.",
            "Premium: decorated gift box with satin ribbon — EGP 30.",
            "Party: birthday and celebration designs — EGP 45.",
          ],
        },
        {
          heading: "How to choose wrapping",
          steps: [
            "In your cart or at checkout, open Gift options.",
            "Pick the wrapping style you prefer.",
            "Complete your order.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "📸 Large events: contact us early if you have a specific vision — we love helping design something unique.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/gift-box", label: { ar: "صناديق الهدايا", en: "Gift boxes" } },
      { href: "/help/articles/g1", label: { ar: "رسالة هدية", en: "Gift message" } },
      { href: "/shop", label: { ar: "المتجر", en: "Shop" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
    ],
  },
  {
    id: "g3",
    categoryId: "gifting",
    icon: "🏢",
    readTime: { ar: "٣ دقائق", en: "3 min read" },
    title: { ar: "هل تقدّمون طلبات للشركات؟", en: "Do you offer corporate orders?" },
    description: {
      ar: "طلبات الشركات والكميات الكبيرة وأسعار الجملة.",
      en: "Corporate gifting, bulk orders, and wholesale pricing.",
    },
    preview: {
      ar: "طلبات الشركات والكميات الكبيرة وأسعار الجملة.",
      en: "Corporate and bulk orders.",
    },
    blocks: {
      ar: [
        {
          paragraphs: [
            "نعم! لدينا برنامج مخصص للشركات والمؤسسات، سواء لتوزيع الهدايا على الموظفين أو لحفلات العمل.",
          ],
        },
        {
          heading: "ما الذي يشمله برنامج الشركات؟",
          list: [
            "أسعار خاصة على الكميات الكبيرة (من 20 علبة فأكثر).",
            "تخصيص العبوات بشعار شركتك.",
            "بطاقات هدايا مخصصة برسالة شركتك.",
            "التوصيل لعنوان واحد أو عناوين متعددة.",
            "فاتورة ضريبية رسمية.",
          ],
        },
        {
          heading: "كيف أطلب؟",
          steps: [
            "تواصل معنا عبر البريد الإلكتروني: corporate@cookiebite.com",
            "أو عبر الواتساب وأخبرنا أن طلبك لشركة.",
            "سيتواصل معك أحد خبراء المبيعات خلال ساعتين.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "⏰ الطلبات الكبيرة: يُفضّل التواصل قبل 48 ساعة على الأقل لضمان التجهيز في الموعد المطلوب.",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "Yes. We have a dedicated program for companies and organizations — employee gifts or business events.",
          ],
        },
        {
          heading: "What the corporate program includes",
          list: [
            "Special pricing on large quantities (20 boxes or more).",
            "Custom packaging with your company logo.",
            "Branded gift cards with your message.",
            "Delivery to one address or multiple locations.",
            "Official tax invoices.",
          ],
        },
        {
          heading: "How to order",
          steps: [
            "Email us at corporate@cookiebite.com",
            "Or message us on WhatsApp and mention it is a corporate order.",
            "A sales specialist will contact you within two hours.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "⏰ Large orders: contact us at least 48 hours ahead to guarantee on-time preparation.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/corporate-gifting", label: { ar: "هدايا الشركات", en: "Corporate gifting" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
      { href: "/help/articles/g4", label: { ar: "كوكيز مخصصة", en: "Custom cookies" } },
      { href: "/help/articles/pay2", label: { ar: "الفواتير", en: "Invoices" } },
    ],
  },
  {
    id: "g4",
    categoryId: "gifting",
    icon: "🎂",
    readTime: { ar: "دقيقتان", en: "2 min read" },
    title: { ar: "هل يمكنني طلب كوكيز مخصصة لمناسبة؟", en: "Can I order custom cookies for an event?" },
    description: {
      ar: "طلب كوكيز بطباعة أو أشكال مخصصة لحفلات أعياد الميلاد والأفراح.",
      en: "Custom shapes, colors, and printing for celebrations.",
    },
    preview: {
      ar: "طلب كوكيز بطباعة أو أشكال مخصصة لحفلات أعياد الميلاد والأفراح.",
      en: "Custom cookies for birthdays and events.",
    },
    blocks: {
      ar: [
        {
          paragraphs: [
            "نعم! نقدّم خدمة الكوكيز المخصصة للمناسبات الخاصة مثل أعياد الميلاد والأفراح والاحتفالات.",
          ],
        },
        {
          heading: "ما الذي يمكن تخصيصه؟",
          list: [
            "الشكل: قلوب، نجوم، حروف، أرقام، وأشكال أخرى.",
            "الألوان: حسب ثيم المناسبة.",
            "الطباعة: صور أو نص أو شعارات بتقنية الطباعة على الشوكولاتة.",
            "العبوة: تغليف مخصص بألوان وتصميم المناسبة.",
          ],
        },
        {
          heading: "كيف أطلب؟",
          steps: [
            "تواصل معنا عبر الواتساب أو الدردشة المباشرة.",
            "أخبرنا عن المناسبة والكمية والتصور الذي تريده.",
            "سنرسل لك موكب اختيارات وعرض سعر.",
            "بعد تأكيد الطلب وسداد مقدّم، نبدأ التجهيز.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ الطلبات المخصصة تحتاج إلى 3-5 أيام عمل كحد أدنى. لا تنتظر آخر لحظة!",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "Yes. We offer custom cookies for birthdays, weddings, and other celebrations.",
          ],
        },
        {
          heading: "What you can customize",
          list: [
            "Shape: hearts, stars, letters, numbers, and more.",
            "Colors: matched to your event theme.",
            "Printing: images, text, or logos on chocolate.",
            "Packaging: custom colors and event-themed design.",
          ],
        },
        {
          heading: "How to order",
          steps: [
            "Contact us on WhatsApp or live chat.",
            "Tell us about the occasion, quantity, and your vision.",
            "We will send mock-up options and a quote.",
            "After confirmation and a deposit, we start production.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ Custom orders need at least 3–5 business days. Do not wait until the last minute.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
      { href: "/corporate-gifting", label: { ar: "هدايا الشركات", en: "Corporate gifting" } },
      { href: "/help/articles/g2", label: { ar: "تغليف الهدايا", en: "Gift wrapping" } },
      { href: "/shop", label: { ar: "المتجر", en: "Shop" } },
    ],
  },
];
