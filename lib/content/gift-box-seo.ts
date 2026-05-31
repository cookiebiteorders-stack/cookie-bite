import type { Lang } from "@/lib/i18n/translations";

export function getGiftBoxBuilderHowTo(lang: Lang) {
  if (lang === "ar") {
    return {
      name: "كيف تصمّم صندوق هدايا كوكيز مخصص في القاهرة الجديدة",
      description:
        "دليل خطوة بخطوة لاختيار صندوق الهدية، ملئه بكوكيز وبrownies، تخصيص التغليف والرسالة، والطلب من كوكي بايت.",
      steps: [
        {
          name: "اختر حجم الصندوق",
          text: "اختر بين Little Bite أو Sweet Spot أو Big Hug أو Golden Bite حسب عدد القطع والمناسبة.",
        },
        {
          name: "املأ الصندوق",
          text: "تصفّح الكوكيز والبراونيز والشوكولاتة والمشروبات والإضافات — أضف ما تحب حتى تكتمل السعة.",
        },
        {
          name: "خصّص الهدية",
          text: "اكتب رسالة (إلى / من)، اختر تصميم البطاقة ولون الشريطة ونمط التغليف.",
        },
        {
          name: "عاين صندوقك",
          text: "شاهد معاينة ثلاثية الأبعاد للصندوق قبل التأكيد.",
        },
        {
          name: "أكمل الطلب",
          text: "راجع المحتويات، اختر التوصيل (نفس اليوم أو مجدول أو استلام)، وأكّد الطلب.",
        },
      ],
    };
  }
  return {
    name: "How to Build a Custom Cookie Gift Box in New Cairo",
    description:
      "Step-by-step guide to choose a gift box size, fill it with Cookie Bite treats, personalize wrapping and message, and checkout in New Cairo.",
    steps: [
      {
        name: "Choose your box size",
        text: "Pick Little Bite, Sweet Spot, Big Hug, or Golden Bite based on capacity and occasion.",
      },
      {
        name: "Fill your box",
        text: "Browse cookies, brownies, chocolates, drinks, and add-ons — add favorites until the box is full.",
      },
      {
        name: "Personalize",
        text: "Write a message (To / From), pick a card design, ribbon color, and gift wrap style.",
      },
      {
        name: "Preview your box",
        text: "Spin the 3D preview to see ribbon, wrap, and treats before checkout.",
      },
      {
        name: "Checkout",
        text: "Review items, choose delivery (same-day, scheduled, or pickup), and place your order.",
      },
    ],
  };
}

export function getGiftBoxPageFaq(lang: Lang): Array<{ q: string; a: string }> {
  if (lang === "ar") {
    return [
      {
        q: "هل يمكنني تصميم صندوق هدايا كوكيز مخصص؟",
        a: "نعم — استخدم أداة «صمّم صندوق هديتك» لاختيار الحجم والمحتويات والتغليف والرسالة في خطوات بسيطة.",
      },
      {
        q: "هل توصّلون صناديق الهدايا في القاهرة الجديدة؟",
        a: "نعم، نوصّل في التجمع الخامس والمناطق القريبة. راجع صفحة التوصيل لمعرفة المناطق والمواعيد.",
      },
      {
        q: "هل تقدّمون هدايا للشركات والمناسبات؟",
        a: "نعم — تغليف بعلامة تجارية، طلبات بالجملة، ودعم مخصص. زُر صفحة هدايا الشركات أو تواصل معنا.",
      },
      {
        q: "ماذا يمكن أن أضع داخل صندوق الهدية؟",
        a: "كوكيز، براونيز، شوكولاتة، مشروبات، وإضافات مثل الشموع أو الدببة الصغيرة — حسب السعة التي تختارها.",
      },
    ];
  }
  return [
    {
      q: "Can I build a custom cookie gift box?",
      a: "Yes — use our Build Your Gift Box tool to pick box size, treats, ribbon, wrap, and a personal message in five steps.",
    },
    {
      q: "Do you deliver gift boxes in New Cairo?",
      a: "Yes — we deliver across Fifth Settlement and nearby areas. See our New Cairo delivery page for zones and timing.",
    },
    {
      q: "Do you offer corporate and bulk gifting?",
      a: "Yes — branded packaging, bulk orders, and dedicated support. Visit corporate gifting or contact us for a quote.",
    },
    {
      q: "What can I put inside a Cookie Bite gift box?",
      a: "Cookies, brownies, chocolates, drinks, and add-ons like candles or mini teddy bears — depending on the box size you choose.",
    },
  ];
}
