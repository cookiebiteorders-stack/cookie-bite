import type { Lang } from "@/lib/i18n/translations";

export function getOurCookiesPageFaq(lang: Lang): Array<{ q: string; a: string }> {
  if (lang === "ar") {
    return [
      {
        q: "ما الفرق بين صفحة «كوكيزنا» والمتجر؟",
        a: "«كوكيزنا» تعرض النكهات حسب المجموعات (كلاسيك، شوكولاتة، محشية، موسمية). المتجر يتيح الفلترة والبحث والطلب المباشر.",
      },
      {
        q: "هل تتغير القائمة باستمرار؟",
        a: "نعم — نضيف إصدارات موسمية محدودة ونحدّث المجموعات. تابع المتجر والمدونة للجديد.",
      },
      {
        q: "هل يمكنني طلب نكهات مختلفة في صندوق واحد؟",
        a: "نعم — استخدم «صمّم صندوق هديتك» لاختيار عدة نكهات في صندوق واحد.",
      },
      {
        q: "هل توصّلون في القاهرة الجديدة؟",
        a: "نعم — التوصيل متاح في التجمع الخامس والمناطق القريبة. راجع صفحة التوصيل للتفاصيل.",
      },
    ];
  }
  return [
    {
      q: "How is Our Cookies different from the shop?",
      a: "Our Cookies groups flavors by collection (classic, chocolate, stuffed, seasonal). The shop adds filters, search, and direct checkout.",
    },
    {
      q: "Does the menu change often?",
      a: "Yes — we add limited seasonal drops and refresh collections. Follow the shop and blog for updates.",
    },
    {
      q: "Can I mix flavors in one gift box?",
      a: "Yes — use Build Your Gift Box to combine multiple flavors in a single box.",
    },
    {
      q: "Do you deliver in New Cairo?",
      a: "Yes — delivery is available across Fifth Settlement and nearby areas. See our New Cairo delivery page.",
    },
  ];
}

export function getOurCookiesRelatedLinks(lang: Lang) {
  if (lang === "ar") {
    return [
      { href: "/shop", label: "تسوّق كل الكوكيز" },
      { href: "/collections/classic", label: "مجموعة الكلاسيكيات" },
      { href: "/collections/seasonal", label: "نكهات موسمية" },
      { href: "/collections/stuffed", label: "كوكيز محشية" },
      { href: "/gift-box/build", label: "صمّم صندوق هديتك" },
      { href: "/delivery/new-cairo", label: "التوصيل في القاهرة الجديدة" },
    ];
  }
  return [
    { href: "/shop", label: "Shop all cookies" },
    { href: "/collections/classic", label: "Classic collection" },
    { href: "/collections/seasonal", label: "Seasonal specials" },
    { href: "/collections/stuffed", label: "Stuffed cookies" },
    { href: "/gift-box/build", label: "Build your gift box" },
    { href: "/delivery/new-cairo", label: "Cookie delivery in New Cairo" },
  ];
}

export function getOurCookiesCollectionLinks(lang: Lang) {
  if (lang === "ar") {
    return [
      { href: "/collections/classic", label: "كلاسيك" },
      { href: "/collections/seasonal", label: "موسمي" },
      { href: "/collections/stuffed", label: "محشي" },
      { href: "/collections/gifts", label: "هدايا" },
    ];
  }
  return [
    { href: "/collections/classic", label: "Classic" },
    { href: "/collections/seasonal", label: "Seasonal" },
    { href: "/collections/stuffed", label: "Stuffed" },
    { href: "/collections/gifts", label: "Gifts" },
  ];
}
