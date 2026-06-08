import { brandLocation } from "@/lib/brand";
import type { Lang } from "@/lib/i18n/translations";
import {
  formatZonesCoverageBody,
  formatZonesCoverageFaqAnswer,
  resolveZoneDisplayLabels,
  type PublicShippingZone,
} from "@/lib/shipping/public-zones-shared";

export function getNewCairoDeliveryFaq(
  lang: Lang,
  zones: PublicShippingZone[],
  freeShippingThresholdEgp: number,
): Array<{ q: string; a: string }> {
  const location = brandLocation(lang);
  const labels = resolveZoneDisplayLabels(zones, lang);

  if (lang === "ar") {
    return [
      {
        q: "هل توصّلون في جميع أنحاء القاهرة الجديدة؟",
        a: formatZonesCoverageFaqAnswer(location, labels, lang),
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
      a: formatZonesCoverageFaqAnswer(location, labels, lang),
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
  const labels = resolveZoneDisplayLabels(zones, lang);
  const zonesBody = formatZonesCoverageBody(labels, lang);

  if (lang === "ar") {
    return {
      eyebrow: "التوصيل",
      title: "توصيل الكوكيز في القاهرة الجديدة",
      subtitle: `كوكيز كوكي بايت الطازجة تُخبز على دفعات صغيرة وتُوصّل من ${location}.`,
      faqHeading: "أسئلة شائعة عن التوصيل",
      ctaLabel: "اطلب الكوكيز الآن",
      ctaHref: "/shop",
      relatedLinksAria: "صفحات ذات صلة",
      sections: [
        {
          heading: "المناطق التي نغطيها",
          body: zonesBody,
        },
        {
          heading: "حد التوصيل المجاني",
          body: `استمتع بالتوصيل المجاني للطلبات المؤهلة فوق ${freeShippingThresholdEgp} جنيه قبل الخصومات عندما تكون منطقتك مؤهلة. تظهر الرسوم وطرق الدفع عند إتمام الطلب.`,
        },
        {
          heading: "التغليف وجودة المنتجات",
          body: "نُغلّف الكوكيز في صناديقنا لتحافظ على جودتها أثناء النقل. للحصول على أفضل قوام، استمتع بها خلال أيام قليلة واحفظها في وعاء محكم.",
        },
      ],
      relatedLinks: [
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
    sections: [
      {
        heading: "Zones we serve",
        body: zonesBody,
      },
      {
        heading: "Free delivery threshold",
        body: `Enjoy free delivery on qualifying orders over ${freeShippingThresholdEgp} EGP before discounts, when your zone is eligible. Fees and payment methods appear at checkout.`,
      },
      {
        heading: "Packaging & freshness",
        body: "Cookies are packed to travel well in our branded boxes. For the best texture, enjoy within a few days and store in an airtight container.",
      },
    ],
    relatedLinks: [
      { href: "/delivery/areas", label: "All delivery areas" },
      { href: "/shop", label: "Shop cookies online" },
      { href: "/gift-box/build", label: "Build a custom gift box" },
      { href: "/help/delivery", label: "Delivery help" },
    ],
    faqs,
  };
}
