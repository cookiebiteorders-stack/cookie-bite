import type { HelpCenterArticle } from "@/lib/content/help-center/types";

export const ORDERS_HELP_ARTICLES: HelpCenterArticle[] = [
  {
    id: "o1",
    categoryId: "orders",
    icon: "🗺️",
    readTime: { ar: "دقيقة", en: "1 min read" },
    title: { ar: "كيف أتابع طلبي؟", en: "How do I track my order?" },
    description: {
      ar: "تتبّع حالة طلبك خطوة بخطوة من التحضير حتى التسليم.",
      en: "Track your order from preparation to delivery.",
    },
    preview: {
      ar: "تتبّع حالة طلبك خطوة بخطوة من التحضير حتى التسليم.",
      en: "Track your order step by step.",
    },
    blocks: {
      ar: [
        {
          paragraphs: [
            "يمكنك متابعة طلبك بسهولة من داخل حسابك أو عبر رسائل الواتساب التي نرسلها تلقائياً.",
          ],
        },
        {
          heading: "من داخل الحساب",
          steps: [
            "سجّل الدخول واضغط على «طلباتي».",
            "اختر الطلب الذي تريد متابعته.",
            "ستجد شريط التقدّم يوضح مرحلة طلبك بدقة.",
          ],
        },
        {
          heading: "مراحل الطلب",
          list: [
            "🟡 قيد المراجعة: استلمنا طلبك ونتحقق منه.",
            "🟠 قيد التحضير: مطبخنا يعمل على طلبك الآن.",
            "🚚 في الطريق: المندوب انطلق إليك.",
            "✅ تم التسليم: وصل طلبك!",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "📱 واتساب: سنرسل لك تحديثاً تلقائياً في كل مرحلة على رقم هاتفك المسجّل.",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "You can track your order easily from your account or via automatic WhatsApp updates.",
          ],
        },
        {
          heading: "From your account",
          steps: [
            "Sign in and open My orders.",
            "Select the order you want to track.",
            "Use the progress bar to see the current stage.",
          ],
        },
        {
          heading: "Order stages",
          list: [
            "🟡 Under review: we received and are verifying your order.",
            "🟠 Preparing: our kitchen is working on your order.",
            "🚚 On the way: your driver is en route.",
            "✅ Delivered: your order has arrived.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "📱 WhatsApp: we send an automatic update at each stage to your registered phone number.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/account/orders", label: { ar: "طلباتي", en: "My orders" } },
      { href: "/account", label: { ar: "حسابي", en: "My account" } },
      { href: "/help/articles/o2", label: { ar: "مناطق التوصيل", en: "Delivery zones" } },
      { href: "/help", label: { ar: "مركز المساعدة", en: "Help center" } },
    ],
  },
  {
    id: "o2",
    categoryId: "orders",
    icon: "📍",
    readTime: { ar: "دقيقتان", en: "2 min read" },
    title: { ar: "ما هي مناطق التوصيل؟", en: "What are your delivery areas?" },
    description: {
      ar: "قائمة المناطق التي نوصّل إليها وأوقات التوصيل.",
      en: "Areas we deliver to and delivery hours.",
    },
    preview: {
      ar: "قائمة المناطق التي نوصّل إليها وأوقات التوصيل.",
      en: "Delivery areas and hours.",
    },
    blocks: {
      ar: [
        {
          paragraphs: ["نغطي معظم مناطق القاهرة الكبرى ونعمل على التوسع باستمرار."],
        },
        {
          heading: "المناطق المتاحة حالياً",
          list: [
            "القاهرة: مدينة نصر، المعادي، مصر الجديدة، التجمع الأول والخامس، الرحاب، مدينتي.",
            "الجيزة: الدقي، المهندسين، الشيخ زايد، 6 أكتوبر، حدائق الأهرام.",
            "الساحل الشمالي: التوصيل متاح في مواسم معينة فقط — تحقق من الموقع.",
          ],
        },
        {
          heading: "أوقات التوصيل",
          list: [
            "السبت – الخميس: من 10 صباحاً حتى 11 مساءً.",
            "الجمعة: من 12 ظهراً حتى 11 مساءً.",
          ],
        },
        {
          heading: "منطقتي غير موجودة في القائمة؟",
          paragraphs: [
            "تواصل معنا! نحن نراجع طلبات التوسع باستمرار وقد تكون منطقتك الفرق القادمة على قائمتنا.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "🚚 Express: التوصيل السريع (خلال ساعتين) متاح في بعض المناطق مقابل رسوم إضافية — ستظهر عند إتمام الطلب.",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "We cover most of Greater Cairo and are expanding delivery coverage continuously.",
          ],
        },
        {
          heading: "Currently available areas",
          list: [
            "Cairo: Nasr City, Maadi, Heliopolis, First and Fifth Settlement, Rehab, Madinaty.",
            "Giza: Dokki, Mohandessin, Sheikh Zayed, 6th of October, Hadayek Al-Ahram.",
            "North Coast: seasonal delivery only — check at checkout.",
          ],
        },
        {
          heading: "Delivery hours",
          list: [
            "Saturday – Thursday: 10:00 AM to 11:00 PM.",
            "Friday: 12:00 PM to 11:00 PM.",
          ],
        },
        {
          heading: "My area is not listed?",
          paragraphs: [
            "Contact us. We review expansion requests regularly and your area may be next on our list.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "🚚 Express: two-hour delivery is available in some areas for an extra fee — shown at checkout.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/shop", label: { ar: "المتجر", en: "Shop" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
      { href: "/help/articles/o1", label: { ar: "تتبع الطلب", en: "Track order" } },
      { href: "/help", label: { ar: "مركز المساعدة", en: "Help center" } },
    ],
  },
  {
    id: "o3",
    categoryId: "orders",
    icon: "✏️",
    readTime: { ar: "دقيقتان", en: "2 min read" },
    title: {
      ar: "هل يمكنني تغيير عنوان التوصيل بعد الطلب؟",
      en: "Can I change my delivery address after ordering?",
    },
    description: {
      ar: "شروط وطريقة تعديل عنوان التوصيل بعد تقديم الطلب.",
      en: "When and how you can update your delivery address.",
    },
    preview: {
      ar: "شروط وطريقة تعديل عنوان التوصيل بعد تقديم الطلب.",
      en: "Change your delivery address after checkout.",
    },
    blocks: {
      ar: [
        {
          paragraphs: ["يمكن تغيير العنوان، لكن ذلك يعتمد على مرحلة طلبك الحالية."],
        },
        {
          heading: "متى يمكن التغيير؟",
          list: [
            "✅ قيد المراجعة: يمكن التغيير بسهولة.",
            "⚠️ قيد التحضير: تواصل معنا فوراً وسنحاول.",
            "❌ في الطريق: لا يمكن تغيير العنوان بعد مغادرة المندوب.",
          ],
        },
        {
          heading: "كيف أغيّر العنوان؟",
          steps: [
            "اذهب إلى طلباتي ← تفاصيل الطلب.",
            "ابحث عن زر «تعديل العنوان» (يظهر فقط إذا كان التغيير ممكناً).",
            "أدخل العنوان الجديد وأكّد التعديل.",
          ],
        },
        {
          paragraphs: ["إذا لم يظهر الزر، تواصل مع الدعم فوراً عبر الدردشة المباشرة."],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ إذا كان العنوان الجديد خارج نطاق التوصيل، قد يستغرق وصول طلبك وقتاً أطول أو قد تختلف رسوم التوصيل.",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "You can change the address depending on your order’s current status.",
          ],
        },
        {
          heading: "When can you change it?",
          list: [
            "✅ Under review: easy to change.",
            "⚠️ Preparing: contact us immediately and we will try.",
            "❌ On the way: cannot change after the driver has left.",
          ],
        },
        {
          heading: "How to change the address",
          steps: [
            "Go to My orders → order details.",
            "Look for Edit address (only shown when changes are allowed).",
            "Enter the new address and confirm.",
          ],
        },
        {
          paragraphs: [
            "If the button does not appear, contact support via live chat right away.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ If the new address is outside our delivery zone, delivery may take longer or fees may change.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/account/orders", label: { ar: "طلباتي", en: "My orders" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
      { href: "/help/articles/o2", label: { ar: "مناطق التوصيل", en: "Delivery zones" } },
      { href: "/help/articles/o4", label: { ar: "إلغاء الطلب", en: "Cancel order" } },
    ],
  },
  {
    id: "o4",
    categoryId: "orders",
    icon: "❌",
    readTime: { ar: "دقيقتان", en: "2 min read" },
    title: { ar: "كيف ألغي طلبي؟", en: "How do I cancel my order?" },
    description: {
      ar: "شروط إلغاء الطلب وكيفية استرداد المبلغ عند الإلغاء.",
      en: "Cancellation rules and refunds when you cancel.",
    },
    preview: {
      ar: "شروط إلغاء الطلب وكيفية استرداد المبلغ عند الإلغاء.",
      en: "Cancellation rules and refunds.",
    },
    blocks: {
      ar: [
        {
          paragraphs: [
            "لأن منتجاتنا تُحضَّر طازجة فور استلام الطلب، فإن الإلغاء له شروط معينة.",
          ],
        },
        {
          heading: "متى يمكن الإلغاء؟",
          list: [
            "✅ خلال 15 دقيقة من تقديم الطلب: إلغاء فوري واسترداد كامل.",
            "⚠️ بعد 15 دقيقة وقبل بدء التحضير: يمكن الإلغاء مع رسوم إدارية بسيطة.",
            "❌ بعد بدء التحضير: لا يمكن الإلغاء لأن المنتج صار جاهزاً.",
          ],
        },
        {
          heading: "كيف ألغي طلبي؟",
          steps: [
            "اذهب إلى طلباتي.",
            "افتح الطلب واضغط «إلغاء الطلب».",
            "اختر سبب الإلغاء وأكّد.",
            "ستصلك رسالة تأكيد وسيتم استرداد المبلغ وفق سياسة الاسترداد.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 بدل الإلغاء: هل يمكنك تأجيل الطلب؟ تواصل معنا وسنحاول إيجاد موعد توصيل أنسب لك.",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "Because our products are prepared fresh when we receive your order, cancellation has specific rules.",
          ],
        },
        {
          heading: "When can you cancel?",
          list: [
            "✅ Within 15 minutes of placing the order: instant cancellation and full refund.",
            "⚠️ After 15 minutes and before preparation starts: cancellation with a small admin fee.",
            "❌ After preparation starts: cannot cancel because the product is ready.",
          ],
        },
        {
          heading: "How to cancel",
          steps: [
            "Go to My orders.",
            "Open the order and tap Cancel order.",
            "Choose a reason and confirm.",
            "You will get a confirmation and a refund per our refund policy.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 Instead of cancelling: need a later slot? Contact us and we will try to reschedule delivery.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/account/orders", label: { ar: "طلباتي", en: "My orders" } },
      { href: "/help/articles/r4", label: { ar: "استرداد المبلغ", en: "Refunds" } },
      { href: "/help/returns", label: { ar: "سياسة الاسترجاع", en: "Returns policy" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
    ],
  },
];
