import type { Lang } from "@/lib/i18n/translations";

export function getShopPageFaq(
  lang: Lang,
  freeShippingThresholdEgp: number,
): Array<{ q: string; a: string }> {
  if (lang === "ar") {
    return [
      {
        q: "هل توصّلون الكوكيز في القاهرة الجديدة؟",
        a: "نعم — نوصّل من مطبخنا في التجمع الخامس إلى معظم المناطق والكمبوندات. راجع صفحة التوصيل أو تواصل على واتساب قبل الطلبات الكبيرة.",
      },
      {
        q: "ما طرق الدفع المتاحة؟",
        a: "تظهر طرق الدفع المناسبة لمنطقتك عند إتمام الطلب. للمساعدة راجع صفحة المساعدة — الدفع والتوصيل.",
      },
      {
        q: "هل يمكنني طلب صندوق هدايا مخصص؟",
        a: "نعم — استخدم أداة «صمّم صندوق هديتك» لاختيار الحجم والمحتويات والتغليف، أو تصفّح صناديق الهدايا الجاهزة.",
      },
      {
        q: "متى يكون التوصيل مجانياً؟",
        a: `الطلبات فوق ${freeShippingThresholdEgp} جنيه (قبل الخصومات) قد ت qualify للتوصيل المجاني حسب المنطقة — التفاصيل عند الدفع.`,
      },
    ];
  }
  return [
    {
      q: "Do you deliver cookies in New Cairo?",
      a: "Yes — we deliver from our Fifth Settlement kitchen across most compounds and neighborhoods. See our New Cairo delivery page or WhatsApp us before large orders.",
    },
    {
      q: "What payment methods do you accept?",
      a: "Eligible payment options for your zone appear at checkout. For details, see our help page on payments and delivery.",
    },
    {
      q: "Can I order a custom gift box?",
      a: "Yes — use Build Your Gift Box to pick size, treats, and wrapping, or browse ready-made gift boxes.",
    },
    {
      q: "When is delivery free?",
      a: `Orders over ${freeShippingThresholdEgp} EGP (before discounts) may qualify for free delivery in eligible zones — fees show at checkout.`,
    },
  ];
}

export function getShopRelatedLinks(lang: Lang) {
  if (lang === "ar") {
    return [
      { href: "/collections/classic", label: "مجموعة الكلاسيكيات" },
      { href: "/collections/gifts", label: "مجموعة الهدايا" },
      { href: "/gift-box/build", label: "صمّم صندوق هديتك" },
      { href: "/delivery/new-cairo", label: "التوصيل في القاهرة الجديدة" },
      { href: "/help/faq", label: "الأسئلة الشائعة" },
    ];
  }
  return [
    { href: "/collections/classic", label: "Classic cookie collection" },
    { href: "/collections/gifts", label: "Cookie gift collection" },
    { href: "/gift-box/build", label: "Build your gift box" },
    { href: "/delivery/new-cairo", label: "Cookie delivery in New Cairo" },
    { href: "/help/faq", label: "Shop & delivery FAQ" },
  ];
}
