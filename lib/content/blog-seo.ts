import type { Lang } from "@/lib/i18n/translations";

export function getBlogPageFaq(lang: Lang): Array<{ q: string; a: string }> {
  if (lang === "ar") {
    return [
      {
        q: "عن ماذا يتحدث مدونة كوكي بايت؟",
        a: "أفكار هدايا بالكوكيز، دلائل النكهات الموسمية، نصائح التخطيط للاحتفالات، وتحديثات من مطبخنا في القاهرة الجديدة.",
      },
      {
        q: "كم مرة تُنشر مقالات جديدة؟",
        a: "نحدّث المدونة بانتظام ونعيد صقل الدلائل الأكثر فائدة مع كل موسم.",
      },
      {
        q: "هل يمكنني الطلب بعد قراءة المقال؟",
        a: "نعم — تصفّح المتجر لطلب الكوكيز، أو صمّم صندوق هدايا مخصصاً من صفحة الباني.",
      },
    ];
  }
  return [
    {
      q: "What does the Cookie Bite blog cover?",
      a: "Cookie gifting ideas, seasonal flavor guides, dessert planning tips, and updates from our New Cairo kitchen.",
    },
    {
      q: "How often are new posts published?",
      a: "We publish updates regularly and refresh our most useful guides throughout the season.",
    },
    {
      q: "Can I order after reading a post?",
      a: "Yes — browse the shop for cookies or build a custom gift box from our builder page.",
    },
  ];
}

export function getBlogRelatedLinks(lang: Lang) {
  if (lang === "ar") {
    return [
      { href: "/shop", label: "تسوّق الكوكيز" },
      { href: "/gift-box/build", label: "صمّم صندوق هدايا" },
      { href: "/delivery/new-cairo", label: "التوصيل في القاهرة الجديدة" },
      { href: "/help/gifting", label: "مساعدة الهدايا" },
    ];
  }
  return [
    { href: "/shop", label: "Shop cookies online" },
    { href: "/gift-box/build", label: "Build a custom gift box" },
    { href: "/delivery/new-cairo", label: "New Cairo cookie delivery" },
    { href: "/help/gifting", label: "Gifting help & tips" },
  ];
}
