import type { HelpCenterArticle } from "@/lib/content/help-center/types";

export const PAYMENT_HELP_ARTICLES: HelpCenterArticle[] = [
  {
    id: "pay1",
    categoryId: "payment",
    icon: "💳",
    readTime: { ar: "دقيقتان", en: "2 min read" },
    title: { ar: "ما هي طرق الدفع المتاحة؟", en: "What payment methods do you accept?" },
    description: {
      ar: "جميع طرق الدفع التي نقبلها عند الشراء.",
      en: "All payment methods accepted at checkout.",
    },
    preview: {
      ar: "جميع طرق الدفع التي نقبلها عند الشراء.",
      en: "Accepted payment methods.",
    },
    blocks: {
      ar: [
        {
          paragraphs: ["نوفّر لك طرق دفع متعددة لتختار ما يناسبك."],
        },
        {
          heading: "طرق الدفع الإلكتروني",
          list: [
            "💳 بطاقات Visa / Mastercard: خصم مباشر.",
            "📱 Vodafone Cash: ادفع من محفظتك.",
            "💸 Instapay: تحويل بنكي فوري.",
            "🏦 Fawry: الدفع عبر منافذ فوري.",
            "🛒 Valu / Sympl: التقسيط على عدة أشهر.",
          ],
        },
        {
          heading: "الدفع عند الاستلام",
          paragraphs: [
            "متاح في معظم مناطق التوصيل. اختره عند إتمام الطلب وادفع كاشاً للمندوب عند وصوله.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 نصيحة: الدفع الإلكتروني المسبق يضمن لك أولوية في قوائم التوصيل خاصةً في الأيام المزدحمة.",
          },
        },
        {
          heading: "هل الدفع آمن؟",
          paragraphs: [
            "نعم تماماً. بوابة الدفع لدينا مشفّرة بمعيار SSL وتستوفي معايير PCI-DSS. لا نحتفظ ببيانات بطاقتك على خوادمنا.",
          ],
        },
      ],
      en: [
        {
          paragraphs: ["We offer several payment options so you can choose what works for you."],
        },
        {
          heading: "Online payment",
          list: [
            "💳 Visa / Mastercard: direct debit.",
            "📱 Vodafone Cash: pay from your wallet.",
            "💸 Instapay: instant bank transfer.",
            "🏦 Fawry: pay at Fawry outlets.",
            "🛒 Valu / Sympl: pay in installments.",
          ],
        },
        {
          heading: "Cash on delivery",
          paragraphs: [
            "Available in most delivery areas. Select it at checkout and pay cash to the driver on arrival.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 Tip: prepaying online can prioritize your order on busy delivery days.",
          },
        },
        {
          heading: "Is payment secure?",
          paragraphs: [
            "Yes. Our gateway uses SSL encryption and meets PCI-DSS standards. We do not store your card details on our servers.",
          ],
        },
      ],
    },
    relatedLinks: [
      { href: "/help/payments", label: { ar: "الدفع والفواتير", en: "Payments help" } },
      { href: "/help/articles/pay4", label: { ar: "فشل الدفع", en: "Payment failed" } },
      { href: "/shop", label: { ar: "المتجر", en: "Shop" } },
      { href: "/help", label: { ar: "مركز المساعدة", en: "Help center" } },
    ],
  },
  {
    id: "pay2",
    categoryId: "payment",
    icon: "🧾",
    readTime: { ar: "دقيقة", en: "1 min read" },
    title: { ar: "كيف أحصل على فاتورتي؟", en: "How do I get my invoice?" },
    description: {
      ar: "تنزيل الفاتورة أو الإيصال الإلكتروني لطلبك.",
      en: "Download your receipt or e-invoice.",
    },
    preview: {
      ar: "تنزيل الفاتورة أو الإيصال الإلكتروني لطلبك.",
      en: "Download your receipt.",
    },
    blocks: {
      ar: [
        {
          paragraphs: ["يمكنك الحصول على إيصال أو فاتورة طلبك بسهولة من داخل حسابك."],
        },
        {
          heading: "تنزيل الإيصال",
          steps: [
            "اذهب إلى طلباتي.",
            "اختر الطلب الذي تريد فاتورته.",
            "اضغط على «تنزيل الإيصال».",
            "سيتم تنزيل ملف PDF يمكنك طباعته أو حفظه.",
          ],
        },
        {
          heading: "الفاتورة الضريبية للشركات",
          paragraphs: [
            "إذا كنت تحتاج فاتورة ضريبية رسمية لشركتك، تواصل معنا عبر البريد الإلكتروني مع بيانات شركتك (الاسم، السجل التجاري، الرقم الضريبي) وسنصدر الفاتورة خلال 48 ساعة.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "📧 إيصال تلقائي: يُرسل إيصال إلكتروني تلقائياً إلى بريدك المسجّل فور تأكيد كل طلب.",
          },
        },
      ],
      en: [
        {
          paragraphs: ["You can get a receipt or invoice for your order easily from your account."],
        },
        {
          heading: "Download receipt",
          steps: [
            "Go to My orders.",
            "Select the order you need.",
            "Tap Download receipt.",
            "A PDF will download for printing or saving.",
          ],
        },
        {
          heading: "Tax invoice for businesses",
          paragraphs: [
            "For an official tax invoice, email us your company details (name, commercial register, tax ID) and we will issue it within 48 hours.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "📧 Automatic receipt: a digital receipt is sent to your registered email as soon as each order is confirmed.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/account/orders", label: { ar: "طلباتي", en: "My orders" } },
      { href: "/corporate-gifting", label: { ar: "هدايا الشركات", en: "Corporate gifting" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
      { href: "/help/payments", label: { ar: "الدفع", en: "Payments" } },
    ],
  },
  {
    id: "pay3",
    categoryId: "payment",
    icon: "🏷️",
    readTime: { ar: "دقيقة", en: "1 min read" },
    title: { ar: "كيف أستخدم كود الخصم؟", en: "How do I use a promo code?" },
    description: {
      ar: "طريقة تطبيق كوبونات ورموز الخصم على طلبك.",
      en: "Apply coupons and discount codes at checkout.",
    },
    preview: {
      ar: "طريقة تطبيق كوبونات ورموز الخصم على طلبك.",
      en: "Apply promo codes at checkout.",
    },
    blocks: {
      ar: [
        {
          paragraphs: ["كوبونات الخصم طريقة رائعة لتوفير المال! إليك كيفية استخدامها."],
        },
        {
          heading: "خطوات تطبيق كود الخصم",
          steps: [
            "أضف المنتجات إلى سلتك.",
            "اذهب إلى صفحة الدفع.",
            "ابحث عن حقل «كود الخصم».",
            "أدخل الكود بالضبط كما هو (الأكواد حساسة للكتابة الكبيرة والصغيرة).",
            "اضغط «تطبيق» وسيُخصم المبلغ فوراً.",
          ],
        },
        {
          heading: "الكود لا يعمل؟ تحقق من هذه النقاط",
          list: [
            "تأكد من انتهاء تاريخ الكود — لكل كود تاريخ انتهاء.",
            "تحقق من الحد الأدنى للطلب المطلوب لتفعيل الكود.",
            "بعض الأكواد تنطبق على منتجات بعينها فقط.",
            "كل كود قابل للاستخدام مرة واحدة لكل حساب.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "🎁 احصل على أكواد: تابعنا على وسائل التواصل واشترك في نشرتنا البريدية للعروض الحصرية.",
          },
        },
      ],
      en: [
        {
          paragraphs: ["Promo codes are a great way to save. Here is how to use them."],
        },
        {
          heading: "Apply a promo code",
          steps: [
            "Add products to your cart.",
            "Go to checkout.",
            "Find the Promo code field.",
            "Enter the code exactly as shown (codes are case-sensitive).",
            "Tap Apply and the discount is applied immediately.",
          ],
        },
        {
          heading: "Code not working?",
          list: [
            "Check the expiry date — every code has one.",
            "Confirm the minimum order value required.",
            "Some codes apply only to specific products.",
            "Each code can be used once per account.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "🎁 Get codes: follow us on social media and subscribe to our newsletter for exclusive offers.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/shop", label: { ar: "المتجر", en: "Shop" } },
      { href: "/help/payments", label: { ar: "الدفع", en: "Payments" } },
      { href: "/help/articles/pay1", label: { ar: "طرق الدفع", en: "Payment methods" } },
      { href: "/account", label: { ar: "حسابي", en: "My account" } },
    ],
  },
  {
    id: "pay4",
    categoryId: "payment",
    icon: "🔄",
    readTime: { ar: "دقيقتان", en: "2 min read" },
    title: { ar: "لماذا لم تنجح عملية الدفع؟", en: "Why did my payment fail?" },
    description: {
      ar: "أسباب فشل الدفع وكيفية حل المشكلة.",
      en: "Common payment failures and how to fix them.",
    },
    preview: {
      ar: "أسباب فشل الدفع وكيفية حل المشكلة.",
      en: "Fix failed payments.",
    },
    blocks: {
      ar: [
        {
          paragraphs: ["فشل عملية الدفع أمر محبط — لكن عادةً يكون الحل بسيطاً."],
        },
        {
          heading: "الأسباب الشائعة وحلولها",
          list: [
            "رصيد غير كافٍ: تحقق من رصيد بطاقتك أو محفظتك.",
            "بيانات البطاقة خاطئة: أعد إدخال رقم البطاقة، تاريخ الانتهاء، ورمز CVV بعناية.",
            "البطاقة لا تدعم المشتريات الإلكترونية: تواصل مع بنكك لتفعيل هذه الميزة.",
            "البنك يحتاج تأكيداً إضافياً (3D Secure): ستصلك رسالة SMS من بنكك — أدخل الرمز لإتمام الدفع.",
            "مشكلة تقنية مؤقتة: انتظر دقيقتين وأعد المحاولة.",
          ],
        },
        {
          heading: "هل خُصم المبلغ رغم فشل الطلب؟",
          paragraphs: [
            "أحياناً يُجمّد البنك المبلغ مؤقتاً حتى لو لم ينجح الطلب. هذا الاحتجاز يُلغى تلقائياً خلال 3-5 أيام عمل. إذا لم يُلغَ، تواصل مع بنكك برقم مرجعية العملية من سجل طلباتنا.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 جرّب طريقة أخرى: إذا استمرت المشكلة، جرّب طريقة دفع مختلفة أو اختر «الدفع عند الاستلام».",
          },
        },
      ],
      en: [
        {
          paragraphs: [
            "A failed payment is frustrating — but the fix is usually straightforward.",
          ],
        },
        {
          heading: "Common causes and fixes",
          list: [
            "Insufficient funds: check your card or wallet balance.",
            "Wrong card details: re-enter card number, expiry, and CVV carefully.",
            "Card not enabled for online purchases: ask your bank to enable it.",
            "Bank needs extra confirmation (3D Secure): enter the SMS code from your bank.",
            "Temporary technical issue: wait two minutes and try again.",
          ],
        },
        {
          heading: "Charged but order failed?",
          paragraphs: [
            "Banks sometimes place a temporary hold even when the order fails. It usually releases within 3–5 business days. If not, contact your bank with the reference from our order history.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 Try another method: use a different payment option or choose cash on delivery.",
          },
        },
      ],
    },
    relatedLinks: [
      { href: "/help/payments", label: { ar: "الدفع", en: "Payments" } },
      { href: "/help/articles/pay1", label: { ar: "طرق الدفع", en: "Payment methods" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
      { href: "/account/orders", label: { ar: "طلباتي", en: "My orders" } },
    ],
  },
];
