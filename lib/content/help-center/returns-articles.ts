import type { HelpCenterArticle } from "@/lib/content/help-center/types";

export const RETURNS_HELP_ARTICLES: HelpCenterArticle[] = [
  {
    id: "r1",
    categoryId: "returns",
    icon: "📦",
    readTime: { ar: "دقيقتان", en: "2 min read" },
    title: { ar: "وصلني طلب خاطئ — ماذا أفعل؟", en: "I received the wrong order — what should I do?" },
    description: {
      ar: "إجراءات الإبلاغ عن منتج مختلف عما طلبته.",
      en: "How to report items that differ from what you ordered.",
    },
    preview: {
      ar: "إجراءات الإبلاغ عن منتج مختلف عما طلبته.",
      en: "Report items that differ from your order.",
    },
    blocks: {
      ar: [
        {
          paragraphs: [
            "نعتذر عن هذا الخطأ! فريقنا يعمل بدقة عالية، لكن قد تحدث أخطاء بشرية. سنصحح الأمر بسرعة.",
          ],
        },
        {
          heading: "خطوات الإبلاغ عن الطلب الخاطئ",
          steps: [
            "لا تستهلك المنتج الخاطئ (كلما أمكن) لنتمكن من استرداده.",
            "التقط صورة واضحة للمنتج وللملصق عليه.",
            "تواصل معنا خلال 24 ساعة من استلام الطلب عبر الدردشة المباشرة أو الواتساب.",
            "أرسل رقم طلبك وصور المنتج الخاطئ.",
          ],
        },
        {
          heading: "ماذا سيحدث بعدها؟",
          paragraphs: [
            "سيتحقق فريقنا من الطلب وسيتواصل معك خلال ساعة واحدة لترتيب إحدى الخيارين:",
          ],
          list: [
            "إعادة إرسال المنتج الصحيح في أقرب وقت ممكن.",
            "استرداد كامل المبلغ إذا لم يكن المنتج متاحاً.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 سرعة التواصل تساعدنا: كلما أبلغتنا أسرع، كلما قدرنا نخدمك أفضل — خاصةً أن منتجاتنا طازجة ولها مدة صلاحية.",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "We are sorry for the mistake. Our team works carefully, but human errors can happen. We will fix this quickly.",
          ],
        },
        {
          heading: "Report a wrong item",
          steps: [
            "Do not consume the wrong product when possible so we can recover it.",
            "Take clear photos of the product and its label.",
            "Contact us within 24 hours of delivery via live chat or WhatsApp.",
            "Send your order number and photos of the wrong item.",
          ],
        },
        {
          heading: "What happens next?",
          paragraphs: [
            "Our team will verify the order and contact you within one hour to arrange one of the following:",
          ],
          list: [
            "Resend the correct product as soon as possible.",
            "A full refund if the correct item is unavailable.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 Tip: The sooner you report, the faster we can help — especially because our products are fresh and perishable.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
      { href: "/help/returns", label: { ar: "سياسة الاسترجاع", en: "Returns policy" } },
      { href: "/help/articles/r2", label: { ar: "منتج تالف", en: "Damaged product" } },
      { href: "/account/orders", label: { ar: "طلباتي", en: "My orders" } },
    ],
  },
  {
    id: "r2",
    categoryId: "returns",
    icon: "💔",
    readTime: { ar: "دقيقتان", en: "2 min read" },
    title: { ar: "وصلني منتج تالف أو مكسور", en: "My product arrived damaged or broken" },
    description: {
      ar: "كيف تبلّغ عن منتج وصل مكسوراً أو غير سليم.",
      en: "How to report damaged or broken items on delivery.",
    },
    preview: {
      ar: "كيف تبلّغ عن منتج وصل مكسوراً أو غير سليم.",
      en: "Report damaged or broken items.",
    },
    blocks: {
      ar: [
        {
          paragraphs: [
            "نعتذر جداً! منتجاتنا تُعبَّأ بعناية، لكن أحياناً يحدث تلف أثناء الشحن. حقك محفوظ بالكامل.",
          ],
        },
        {
          heading: "ما الذي يُعدّ تلفاً مقبولاً للمطالبة؟",
          list: [
            "عبوة مكسورة أو مفتوحة عند الاستلام.",
            "كوكيز أو براونيز متفتتة بشكل كامل (وليس مجرد فتات طبيعي).",
            "منتج ذاب أو تشوّه شكله بسبب درجة الحرارة.",
            "وجود رائحة أو طعم غير طبيعي.",
          ],
        },
        {
          heading: "خطوات المطالبة",
          steps: [
            "التقط صورة أو فيديو يوضح التلف بوضوح.",
            "تواصل معنا عبر الدردشة أو الواتساب خلال 12 ساعة من الاستلام.",
            "أرسل رقم الطلب والصور.",
            "سيتواصل معك فريقنا خلال ساعة ليرتّب الحل المناسب.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "✅ نضمن لك: إما إعادة إرسال كامل للمنتج السليم، أو استرداد كامل للمبلغ — بدون تعقيدات.",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "We are very sorry. Our products are packed carefully, but shipping damage can happen. Your rights are fully protected.",
          ],
        },
        {
          heading: "What counts as damage for a claim?",
          list: [
            "Broken or opened packaging on delivery.",
            "Cookies or brownies crushed beyond normal crumbs.",
            "Product melted or misshapen due to temperature.",
            "Unusual smell or taste.",
          ],
        },
        {
          heading: "Claim steps",
          steps: [
            "Take clear photos or a short video showing the damage.",
            "Contact us via chat or WhatsApp within 12 hours of delivery.",
            "Send your order number and the photos.",
            "Our team will contact you within one hour to arrange the right solution.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "✅ We guarantee: either a full replacement of the correct item or a full refund — no hassle.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
      { href: "/help/returns", label: { ar: "سياسة الاسترجاع", en: "Returns policy" } },
      { href: "/help/articles/r4", label: { ar: "استرداد المبلغ", en: "Refunds" } },
      { href: "/help/articles/r1", label: { ar: "طلب خاطئ", en: "Wrong order" } },
    ],
  },
  {
    id: "r3",
    categoryId: "returns",
    icon: "🔢",
    readTime: { ar: "دقيقة", en: "1 min read" },
    title: { ar: "الطلب وصل ناقصاً", en: "My order arrived incomplete" },
    description: {
      ar: "ماذا تفعل إذا كان عدد القطع أقل مما طلبته.",
      en: "What to do if you received fewer items than ordered.",
    },
    preview: {
      ar: "ماذا تفعل إذا كان عدد القطع أقل مما طلبته.",
      en: "Fewer items than you ordered.",
    },
    blocks: {
      ar: [
        {
          paragraphs: ["إذا لاحظت أن طلبك وصل بعدد أقل من المطلوب، سنعوّضك فوراً."],
        },
        {
          heading: "كيف أتحقق من الطلب؟",
          paragraphs: [
            "قبل التواصل معنا، قارن محتوى الطلب بتفاصيل الفاتورة داخل العبوة أو في بريدك الإلكتروني.",
          ],
        },
        {
          heading: "خطوات الإبلاغ",
          steps: [
            "افتح الطلب في حسابك وتحقق من الكميات المطلوبة.",
            "عدّ القطع المستلمة وحدّد الناقص بدقة.",
            "تواصل معنا عبر الدردشة مع رقم الطلب وتفاصيل النقص.",
          ],
        },
        {
          heading: "الحل",
          paragraphs: [
            "سنرسل لك القطع الناقصة في أقرب موعد توصيل متاح، أو سنرد عليك المبلغ المقابل للكمية الناقصة — وفق تفضيلك.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ يُرجى الإبلاغ خلال 24 ساعة من الاستلام لنتمكن من مراجعة سجلات التعبئة لدينا.",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "If your order arrived with fewer items than you ordered, we will make it right right away.",
          ],
        },
        {
          heading: "Verify your order first",
          paragraphs: [
            "Before contacting us, compare what you received with the invoice in the box or in your confirmation email.",
          ],
        },
        {
          heading: "How to report",
          steps: [
            "Open the order in your account and check the quantities ordered.",
            "Count what you received and note exactly what is missing.",
            "Contact us via chat with your order number and what is missing.",
          ],
        },
        {
          heading: "Resolution",
          paragraphs: [
            "We will send the missing items on the next available delivery slot, or refund the value of the missing quantity — your choice.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ Please report within 24 hours of delivery so we can review our packing records.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/account/orders", label: { ar: "طلباتي", en: "My orders" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
      { href: "/help/returns", label: { ar: "سياسة الاسترجاع", en: "Returns policy" } },
      { href: "/help/articles/r1", label: { ar: "طلب خاطئ", en: "Wrong order" } },
    ],
  },
  {
    id: "r4",
    categoryId: "returns",
    icon: "💰",
    readTime: { ar: "٣ دقائق", en: "3 min read" },
    title: { ar: "كيف يتم استرداد المبلغ؟", en: "How do refunds work?" },
    description: {
      ar: "مدة ومراحل استرداد المبلغ إلى بطاقتك أو محفظتك.",
      en: "Refund timelines by payment method.",
    },
    preview: {
      ar: "مدة ومراحل استرداد المبلغ إلى بطاقتك أو محفظتك.",
      en: "Refund timelines by payment method.",
    },
    blocks: {
      ar: [
        {
          paragraphs: ["بعد الموافقة على طلب الاسترداد، سيتم إعادة المبلغ وفق الطريقة التالية:"],
        },
        {
          heading: "مدة الاسترداد حسب طريقة الدفع",
          list: [
            "بطاقة ائتمان / خصم: من 5 إلى 10 أيام عمل حسب بنكك.",
            "محفظة إلكترونية (Vodafone Cash / Instapay): خلال 24-48 ساعة.",
            "رصيد Cookie Bite: فوري — يضاف مباشرةً إلى حسابك ويمكن استخدامه في طلبك القادم.",
            "الدفع عند الاستلام: سنتواصل معك لترتيب تحويل المبلغ عبر Instapay.",
          ],
        },
        {
          heading: "متى تبدأ عملية الاسترداد؟",
          paragraphs: [
            "تبدأ عملية الاسترداد فور موافقة فريقنا على طلبك. ستصلك رسالة تأكيد بالبريد الإلكتروني.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 أسرع خيار: اختر «رصيد Cookie Bite» إذا كنت ستطلب منا مجدداً — يكون فورياً ويمكنك استخدامه في نفس اليوم.",
          },
        },
        {
          heading: "لم يصلني الاسترداد في الموعد؟",
          paragraphs: [
            "تواصل معنا مع رقم طلب الاسترداد وسنتابع الأمر مع البنك أو جهة الدفع نيابةً عنك.",
          ],
        },
      ],
      en: [
        {
          paragraphs: [
            "After your refund request is approved, the amount is returned according to how you paid:",
          ],
        },
        {
          heading: "Refund timing by payment method",
          list: [
            "Credit or debit card: 5–10 business days depending on your bank.",
            "Mobile wallet (Vodafone Cash / Instapay): within 24–48 hours.",
            "Cookie Bite store credit: instant — added to your account for your next order.",
            "Cash on delivery: we will arrange an Instapay transfer with you.",
          ],
        },
        {
          heading: "When does the refund start?",
          paragraphs: [
            "Processing begins as soon as our team approves your request. You will receive a confirmation email.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 Fastest option: choose Cookie Bite store credit if you plan to order again — it is instant and usable the same day.",
          },
        },
        {
          heading: "Refund not received on time?",
          paragraphs: [
            "Contact us with your refund reference and we will follow up with your bank or payment provider on your behalf.",
          ],
        },
      ],
    },
    relatedLinks: [
      { href: "/help/returns", label: { ar: "سياسة الاسترجاع", en: "Returns policy" } },
      { href: "/help/payments", label: { ar: "الدفع", en: "Payments" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
      { href: "/account", label: { ar: "حسابي", en: "My account" } },
    ],
  },
];
