import { brandLocation } from "@/lib/brand";
import type { Lang } from "@/lib/i18n/translations";
import type { PublicShippingZone } from "@/lib/shipping/public-zones-shared";

export function getNewCairoDeliveryFaq(
  lang: Lang,
  _zones: PublicShippingZone[],
  freeShippingThresholdEgp: number,
): Array<{ q: string; a: string }> {
  if (lang === "ar") {
    return [
      {
        q: "هل توصّلون في جميع أنحاء القاهرة الجديدة؟",
        a: "نعم — جميع تفاصيل الشحن والتوصيل والمناطق والرسوم في صفحة الشحن والتوصيل.",
      },
      {
        q: "ما حد التوصيل المجاني؟",
        a: `الطلبات فوق ${freeShippingThresholdEgp} جنيه (قبل الخصومات) قد تستحق التوصيل المجاني حيث تسمح المنطقة.`,
      },
      {
        q: "كم يستغرق توصيل الكوكيز؟",
        a: "معظم الطلبات تُجدول خلال 1–2 يوم حسب سعة الخبز ومنطقتك. راسلنا على واتساب للمواعيد العاجلة.",
      },
      {
        q: "هل يتوفر توصيل صناديق الهدايا في نفس اليوم؟",
        a: "قد يتوفر في أيام محددة — تواصل قبل الدفع مع اسم الكمبوند والوقت المفضل.",
      },
    ];
  }

  return [
    {
      q: "Do you deliver across New Cairo?",
      a: "Yes — all shipping and delivery details, zones, and fees are on our shipping & delivery page.",
    },
    {
      q: "What is the free delivery threshold?",
      a: `Orders over ${freeShippingThresholdEgp} EGP (before discounts) qualify for free delivery where the zone allows it.`,
    },
    {
      q: "How fast is cookie delivery in New Cairo?",
      a: "Most orders are scheduled within 1–2 days depending on bake capacity and your area. Contact us on WhatsApp for urgent dates.",
    },
    {
      q: "Can I order cookie gift boxes for same-day delivery?",
      a: "Same-day may be available on select days — message us before checkout with your compound name and preferred time window.",
    },
  ];
}

export function getNewCairoDeliveryContent(
  lang: Lang,
  zones: PublicShippingZone[],
  freeShippingThresholdEgp: number,
) {
  const faqs = getNewCairoDeliveryFaq(lang, zones, freeShippingThresholdEgp);
  const location = brandLocation(lang);

  if (lang === "ar") {
    return {
      eyebrow: "التوصيل",
      title: "توصيل الكوكيز في القاهرة الجديدة",
      subtitle: `كوكيز كوكي بايت الطازجة تُخبز على دفعات صغيرة وتُوصّل من ${location}.`,
      faqHeading: "أسئلة شائعة عن التوصيل",
      ctaLabel: "اطلب الكوكيز الآن",
      ctaHref: "/shop",
      relatedLinksAria: "صفحات ذات صلة",
      highlights: [
        {
          icon: "truck" as const,
          title: "توصيل في القاهرة الجديدة",
          body: "من التجمع الخامس وكمبوندات محيطة — تفاصيل المناطق في صفحة مخصّصة.",
        },
        {
          icon: "clock" as const,
          title: "1–2 يوم للجدولة",
          body: "معظم الطلبات تُحضَّر خلال يوم أو يومين حسب سعة الخبز ومنطقتك.",
        },
        {
          icon: "gift" as const,
          title: "صناديق هدايا",
          body: "للطلبات الكبيرة أو المواعيد العاجلة، أكّد العنوان على واتساب قبل الدفع.",
        },
      ],
      features: [
        {
          icon: "truck" as const,
          title: "حد التوصيل المجاني",
          body: `استمتع بالتوصيل المجاني للطلبات المؤهلة فوق ${freeShippingThresholdEgp} جنيه قبل الخصومات عندما تكون منطقتك مؤهلة. تظهر الرسوم وطرق الدفع عند إتمام الطلب.`,
        },
        {
          icon: "package" as const,
          title: "التغليف والعناية بالجودة",
          body: "تُغلَّف قطع الكوكيز بعناية في صناديقنا للحفاظ على جودتها أثناء النقل. للاستمتاع بأفضل قوام، تُؤكل خلال أيام قليلة وتُحفظ في وعاء محكم.",
        },
      ],
      areasBanner: {
        title: "تبحث عن كمبوندك؟",
        body: "اعرض قائمة المناطق والكمبوندات التي نخدمها بانتظام — محدَّثة من لوحة الشحن.",
        ctaLabel: "مناطق التوصيل",
        ctaHref: "/delivery/areas",
      },
      whatsappLabel: "تأكيد العنوان على واتساب",
      whatsappHint: "أرسل اسم الكمبوند والعنوان قبل طلبات الهدايا الكبيرة أو التوصيل العاجل.",
      relatedLinks: [
        { href: "/shipping", label: "الشحن والتوصيل" },
        { href: "/delivery/areas", label: "مناطق التوصيل بالتفصيل" },
        { href: "/shop", label: "تسوّق الكوكيز" },
        { href: "/gift-box/build", label: "صمّم صندوق هدايا" },
        { href: "/help/delivery", label: "مساعدة التوصيل" },
      ],
      faqs,
    };
  }

  return {
    eyebrow: "Delivery",
    title: "Cookie delivery in New Cairo",
    subtitle: `Fresh Cookie Bite boxes baked in small batches and delivered from ${location}.`,
    faqHeading: "Frequently asked questions",
    ctaLabel: "Order cookies",
    ctaHref: "/shop",
    relatedLinksAria: "Related pages",
    highlights: [
      {
        icon: "truck" as const,
        title: "New Cairo delivery",
        body: "From Fifth Settlement and nearby compounds — see the full area list on our zones page.",
      },
      {
        icon: "clock" as const,
        title: "1–2 day scheduling",
        body: "Most orders are prepared within one or two days depending on bake capacity and your area.",
      },
      {
        icon: "gift" as const,
        title: "Gift boxes",
        body: "For large gift orders or urgent dates, confirm your address on WhatsApp before checkout.",
      },
    ],
    features: [
      {
        icon: "truck" as const,
        title: "Free delivery threshold",
        body: `Enjoy free delivery on qualifying orders over ${freeShippingThresholdEgp} EGP before discounts, when your zone is eligible. Fees and payment methods appear at checkout.`,
      },
      {
        icon: "package" as const,
        title: "Packaging & freshness",
        body: "Cookies are packed to travel well in our branded boxes. For the best texture, enjoy within a few days and store in an airtight container.",
      },
    ],
    areasBanner: {
      title: "Looking for your compound?",
      body: "Browse the neighborhoods and compounds we frequently serve — synced from our shipping zones.",
      ctaLabel: "All delivery areas",
      ctaHref: "/delivery/areas",
    },
    whatsappLabel: "Confirm your address on WhatsApp",
    whatsappHint: "Send your compound name and address before large gift orders or urgent delivery.",
    relatedLinks: [
      { href: "/shipping", label: "Shipping & delivery" },
      { href: "/delivery/areas", label: "All delivery areas" },
      { href: "/shop", label: "Shop cookies online" },
      { href: "/gift-box/build", label: "Build a custom gift box" },
      { href: "/help/delivery", label: "Delivery help" },
    ],
    faqs,
  };
}
