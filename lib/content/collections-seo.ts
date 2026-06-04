import type { Lang } from "@/lib/i18n/translations";
import type { CollectionSeoKey } from "@/lib/seo";

type CollectionMeta = {
  title: string;
  description: string;
  keywords: string[];
  eyebrow: string;
  pageTitle: string;
  subtitle: string;
  intro: string;
  faqHeading: string;
  shopAllLabel: string;
  giftBoxesLabel: string;
  buildBoxLabel: string;
  relatedLinksAria: string;
  emptyHint: string;
  faqs: Array<{ q: string; a: string }>;
  relatedLinks: Array<{ href: string; label: string }>;
};

const EN: Record<CollectionSeoKey, CollectionMeta> = {
  classic: {
    title: "Classic Cookie Collection in New Cairo",
    description:
      "Shop timeless Cookie Bite classics — buttery dough, Belgian chocolate, and crowd favorites. Handcrafted in Fifth Settlement with delivery across New Cairo.",
    keywords: [
      "classic cookies cairo",
      "chocolate chip cookies egypt",
      "cookie bite classics",
      "best cookies new cairo",
    ],
    eyebrow: "Collection",
    pageTitle: "Classic cookies",
    subtitle: "Timeless flavors baked in small batches",
    intro:
      "Buttery classics and crowd-pleasing chocolate chip cookies — perfect for everyday treats, mixed gift boxes, and sharing in New Cairo.",
    faqHeading: "Classic cookies FAQ",
    shopAllLabel: "View all cookies",
    giftBoxesLabel: "Gift boxes",
    buildBoxLabel: "Build your gift box",
    relatedLinksAria: "Explore more cookies",
    emptyHint: "New classic flavors coming soon — browse the full shop.",
    faqs: [
      {
        q: "What counts as a classic Cookie Bite flavor?",
        a: "Our classics include chocolate chip, double chocolate, and other everyday favorites baked with real butter and Belgian chocolate in New Cairo.",
      },
      {
        q: "Can I mix classics in a gift box?",
        a: "Yes — use Build Your Gift Box to combine classic cookies with brownies, chocolates, and add-ons.",
      },
      {
        q: "Do you deliver classic cookies in New Cairo?",
        a: "Yes — we deliver across Fifth Settlement and nearby compounds. See our New Cairo delivery page for zones.",
      },
    ],
    relatedLinks: [
      { href: "/shop", label: "Shop all cookies" },
      { href: "/collections/seasonal", label: "Seasonal specials" },
      { href: "/our-cookies", label: "Full flavor menu" },
      { href: "/delivery/new-cairo", label: "Cookie delivery in New Cairo" },
    ],
  },
  seasonal: {
    title: "Seasonal Cookie Specials in New Cairo",
    description:
      "Limited-batch seasonal cookies from Cookie Bite — holiday flavors, summer drops, and rotating specials baked fresh in New Cairo.",
    keywords: [
      "seasonal cookies cairo",
      "limited edition cookies egypt",
      "holiday cookies new cairo",
      "cookie bite seasonal menu",
    ],
    eyebrow: "Collection",
    pageTitle: "Seasonal cookies",
    subtitle: "Limited batches and rotating drops",
    intro:
      "Seasonal flavors celebrate the moment — from holiday spices to summer-inspired bakes. Grab them while they last in New Cairo.",
    faqHeading: "Seasonal cookies FAQ",
    shopAllLabel: "View all cookies",
    giftBoxesLabel: "Gift boxes",
    buildBoxLabel: "Build your gift box",
    relatedLinksAria: "Explore more cookies",
    emptyHint: "No seasonal items listed right now — check the shop for new drops.",
    faqs: [
      {
        q: "How often do seasonal flavors change?",
        a: "We rotate limited batches throughout the year — follow our blog and shop for new seasonal drops in New Cairo.",
      },
      {
        q: "Can I pre-order seasonal cookies for an event?",
        a: "Yes — contact us or WhatsApp with your date and quantity for seasonal or bulk orders.",
      },
      {
        q: "Are seasonal cookies available for gift boxes?",
        a: "When in stock, seasonal treats can be added via our gift box builder or curated gift collections.",
      },
    ],
    relatedLinks: [
      { href: "/shop", label: "Shop all cookies" },
      { href: "/collections/classic", label: "Classic collection" },
      { href: "/blog", label: "Seasonal tips on our blog" },
      { href: "/gift-box/build", label: "Build a custom gift box" },
    ],
  },
  stuffed: {
    title: "Stuffed Cookies in New Cairo",
    description:
      "Gooey stuffed cookies with Nutella, caramel, and premium fillings — order handcrafted stuffed cookies from Cookie Bite in New Cairo.",
    keywords: [
      "stuffed cookies cairo",
      "nutella cookies egypt",
      "filled cookies new cairo",
      "gooey cookies cairo",
    ],
    eyebrow: "Collection",
    pageTitle: "Stuffed cookies",
    subtitle: "Gooey centers and premium fillings",
    intro:
      "Stuffed cookies with rich centers — Nutella, caramel, and more for thoughtful gifting and special treats in New Cairo.",
    faqHeading: "Stuffed cookies FAQ",
    shopAllLabel: "View all cookies",
    giftBoxesLabel: "Gift boxes",
    buildBoxLabel: "Build your gift box",
    relatedLinksAria: "Explore more cookies",
    emptyHint: "Stuffed flavors restock often — browse the shop for what's fresh today.",
    faqs: [
      {
        q: "What fillings do stuffed Cookie Bite cookies use?",
        a: "Popular fillings include Nutella, caramel, and seasonal centers — each batch is baked fresh in our New Cairo kitchen.",
      },
      {
        q: "How should I store stuffed cookies?",
        a: "Enjoy within a few days for the best gooey texture. Store in an airtight container at room temperature.",
      },
      {
        q: "Can I add stuffed cookies to a gift box?",
        a: "Yes — pick them in Build Your Gift Box when available, or ask us on WhatsApp for custom assortments.",
      },
    ],
    relatedLinks: [
      { href: "/shop", label: "Shop all cookies" },
      { href: "/collections/classic", label: "Classic collection" },
      { href: "/gift-box/build", label: "Build your gift box" },
      { href: "/delivery/new-cairo", label: "New Cairo delivery" },
    ],
  },
  gifts: {
    title: "Cookie Gift Boxes & Occasions in New Cairo",
    description:
      "Premium cookie gift boxes for birthdays, Eid, weddings, and corporate gifting — curated assortments and custom builds from Cookie Bite New Cairo.",
    keywords: [
      "cookie gift box cairo",
      "birthday cookie gifts",
      "corporate cookie gifts egypt",
      "curated cookie box new cairo",
    ],
    eyebrow: "Collection",
    pageTitle: "Cookie gifts",
    subtitle: "Boxes built for celebrations",
    intro:
      "Curated gift assortments and premium packaging for birthdays, thank-yous, Eid, and corporate moments — delivered across New Cairo.",
    faqHeading: "Cookie gifts FAQ",
    shopAllLabel: "View all cookies",
    giftBoxesLabel: "Browse gift boxes",
    buildBoxLabel: "Build your own box",
    relatedLinksAria: "Gifting & ordering",
    emptyHint: "Gift assortments update regularly — explore gift boxes or build your own.",
    faqs: [
      {
        q: "Can I customize a cookie gift box?",
        a: "Yes — use Build Your Gift Box to choose size, treats, ribbon, wrap, and a personal message.",
      },
      {
        q: "Do you offer corporate cookie gifts?",
        a: "Yes — branded packaging and bulk orders are available. Visit our corporate gifting page for details.",
      },
      {
        q: "Do gift boxes deliver in New Cairo?",
        a: "Yes — we deliver across Fifth Settlement and nearby areas. Confirm your zone on our delivery page.",
      },
    ],
    relatedLinks: [
      { href: "/gift-box", label: "Cookie gift boxes" },
      { href: "/gift-box/build", label: "Build your gift box" },
      { href: "/corporate-gifting", label: "Corporate gifting" },
      { href: "/help/gifting", label: "Gifting help" },
    ],
  },
};

const AR: Record<CollectionSeoKey, CollectionMeta> = {
  classic: {
    title: "مجموعة الكوكيز الكلاسيكية | كوكي بايت — القاهرة الجديدة",
    description:
      "تسوّق كلاسيكيات كوكي بايت — زبدة حقيقية، شوكولاتة بلجيكية، ونكهات محبوبة. مخبوزة في التجمع الخامس مع توصيل في القاهرة الجديدة.",
    keywords: [
      "كوكيز كلاسيك القاهرة",
      "شوكولاتة شيب كوكيز مصر",
      "كوكي بايت كلاسيك",
    ],
    eyebrow: "مجموعة",
    pageTitle: "كوكيز كلاسيكية",
    subtitle: "نكهات خالدة تُخبز على دفعات صغيرة",
    intro:
      "كلاسيكيات بزبدة غنية وشوكولاتة شيب محبوبة — مثالية لليوميات وصناديق الهدايا المختلطة في القاهرة الجديدة.",
    faqHeading: "أسئلة عن الكلاسيكيات",
    shopAllLabel: "عرض كل الكوكيز",
    giftBoxesLabel: "صناديق الهدايا",
    buildBoxLabel: "صمّم صندوقك",
    relatedLinksAria: "اكتشف المزيد",
    emptyHint: "نكهات كلاسيكية جديدة قريباً — تصفّح المتجر الكامل.",
    faqs: [
      {
        q: "ما الذي يُعد كلاسيكياً في كوكي بايت؟",
        a: "تشمل الكلاسيكيات شوكولاتة شيب والدبل شوكولاتة ونكهات يومية أخرى بزبدة حقيقية وشوكولاتة بلجيكية.",
      },
      {
        q: "هل يمكنني مزج الكلاسيكيات في صندوق هدايا؟",
        a: "نعم — استخدم «صمّم صندوق هديتك» لدمج الكلاسيكيات مع البراونيز والشوكولاتة والإضافات.",
      },
      {
        q: "هل توصّلون الكلاسيكيات في القاهرة الجديدة؟",
        a: "نعم — نوصّل في التجمع الخامس والمناطق القريبة. راجع صفحة التوصيل.",
      },
    ],
    relatedLinks: [
      { href: "/shop", label: "تسوّق كل الكوكيز" },
      { href: "/collections/seasonal", label: "إصدارات موسمية" },
      { href: "/our-cookies", label: "قائمة النكهات الكاملة" },
      { href: "/delivery/new-cairo", label: "التوصيل في القاهرة الجديدة" },
    ],
  },
  seasonal: {
    title: "كوكيز موسمية محدودة | كوكي بايت — القاهرة الجديدة",
    description:
      "دفعات موسمية محدودة من كوكي بايت — نكهات الأعياد والصيف والإصدارات المتجددة في القاهرة الجديدة.",
    keywords: [
      "كوكيز موسمية القاهرة",
      "إصدارات محدودة كوكيز مصر",
      "كوكيز أعياد القاهرة الجديدة",
    ],
    eyebrow: "مجموعة",
    pageTitle: "كوكيز موسمية",
    subtitle: "دفعات محدودة ونكهات متجددة",
    intro:
      "نكهات تحتفل بالموسم — من توابل الأعياد إلى إلهام الصيف. اطلبها قبل نفاد الكمية في القاهرة الجديدة.",
    faqHeading: "أسئلة عن الموسمية",
    shopAllLabel: "عرض كل الكوكيز",
    giftBoxesLabel: "صناديق الهدايا",
    buildBoxLabel: "صمّم صندوقك",
    relatedLinksAria: "اكتشف المزيد",
    emptyHint: "لا توجد موسمية معروضة الآن — راجع المتجر للإصدارات الجديدة.",
    faqs: [
      {
        q: "كم مرة تتغير النكهات الموسمية؟",
        a: "نُجدّد الدفعات المحدودة على مدار العام — تابع المدونة والمتجر للإصدارات الجديدة.",
      },
      {
        q: "هل يمكن الحجز المسبق للمناسبات؟",
        a: "نعم — تواصل أو راسلنا على واتساب بالتاريخ والكمية.",
      },
      {
        q: "هل تُضاف الموسمية لصناديق الهدايا؟",
        a: "عند التوفر، يمكن إضافتها عبر باني الصندوق أو مجموعات الهدايا.",
      },
    ],
    relatedLinks: [
      { href: "/shop", label: "تسوّق كل الكوكيز" },
      { href: "/collections/classic", label: "مجموعة الكلاسيكيات" },
      { href: "/blog", label: "نصائح موسمية في المدونة" },
      { href: "/gift-box/build", label: "صمّم صندوق هدايا" },
    ],
  },
  stuffed: {
    title: "كوكيز محشية | كوكي بايت — القاهرة الجديدة",
    description:
      "كوكيز محشية بمراكز ذائبة — نوتيلا، كراميل، وحشوات فاخرة. اطلب من كوكي بايت في القاهرة الجديدة.",
    keywords: [
      "كوكيز محشية القاهرة",
      "كوكيز نوتيلا مصر",
      "كوكيز محشي التجمع الخامس",
    ],
    eyebrow: "مجموعة",
    pageTitle: "كوكيز محشية",
    subtitle: "مراكز ذائبة وحشوات فاخرة",
    intro:
      "كوكيز محشية بمراكز سائلة — نوتيلا وكراميل والمزيد للهدايا واللحظات الخاصة في القاهرة الجديدة.",
    faqHeading: "أسئلة عن المحشية",
    shopAllLabel: "عرض كل الكوكيز",
    giftBoxesLabel: "صناديق الهدايا",
    buildBoxLabel: "صمّم صندوقك",
    relatedLinksAria: "اكتشف المزيد",
    emptyHint: "المحشية تُعاد تخبيزها بانتظام — تصفّح المتجر لما هو طازج اليوم.",
    faqs: [
      {
        q: "ما الحشوات المستخدمة؟",
        a: "من الأشهر نوتيلا وكراميل ومراكز موسمية — كل دفعة طازجة من مطبخنا.",
      },
      {
        q: "كيف أحفظ الكوكيز المحشية؟",
        a: "استمتع خلال أيام قليلة للحصول على أفضل قوام. احفظها في وعاء محكم.",
      },
      {
        q: "هل يمكن إضافتها لصندوق هدايا؟",
        a: "نعم — اخترها في باني الصندوق عند التوفر أو راسلنا على واتساب.",
      },
    ],
    relatedLinks: [
      { href: "/shop", label: "تسوّق كل الكوكيز" },
      { href: "/collections/classic", label: "مجموعة الكلاسيكيات" },
      { href: "/gift-box/build", label: "صمّم صندوق هديتك" },
      { href: "/delivery/new-cairo", label: "التوصيل في القاهرة الجديدة" },
    ],
  },
  gifts: {
    title: "صناديق هدايا الكوكيز | كوكي بايت — القاهرة الجديدة",
    description:
      "صناديق هدايا كوكيز فاخرة لأعياد الميلاد والعيد والزفاف وهدايا الشركات — مجموعات جاهزة ومخصصة في القاهرة الجديدة.",
    keywords: [
      "صناديق هدايا كوكيز القاهرة",
      "هدايا عيد ميلاد كوكيز",
      "هدايا شركات كوكيز مصر",
    ],
    eyebrow: "مجموعة",
    pageTitle: "هدايا الكوكيز",
    subtitle: "صناديق للاحتفالات",
    intro:
      "مجموعات هدايا وتغليف فاخر لأعياد الميلاد والشكر والعيد والشركات — مع توصيل في القاهرة الجديدة.",
    faqHeading: "أسئلة عن هدايا الكوكيز",
    shopAllLabel: "عرض كل الكوكيز",
    giftBoxesLabel: "تصفّح صناديق الهدايا",
    buildBoxLabel: "صمّم صندوقك بنفسك",
    relatedLinksAria: "الهدايا والطلب",
    emptyHint: "مجموعات الهدايا تُحدّث بانتظام — جرّب الباني أو صفحة الهدايا.",
    faqs: [
      {
        q: "هل يمكن تخصيص صندوق الهدايا؟",
        a: "نعم — استخدم باني الصندوق لاختيار الحجم والمحتويات والشريطة والرسالة.",
      },
      {
        q: "هل تقدّمون هدايا للشركات؟",
        a: "نعم — تغليف بعلامة تجارية وطلبات بالجملة. راجع صفحة هدايا الشركات.",
      },
      {
        q: "هل توصّلون صناديق الهدايا؟",
        a: "نعم — في التجمع الخامس والمناطق القريبة. أكّد منطقتك في صفحة التوصيل.",
      },
    ],
    relatedLinks: [
      { href: "/gift-box", label: "صناديق هدايا الكوكيز" },
      { href: "/gift-box/build", label: "صمّم صندوق هديتك" },
      { href: "/corporate-gifting", label: "هدايا الشركات" },
      { href: "/help/gifting", label: "مساعدة الهدايا" },
    ],
  },
};

export function getCollectionPageContent(slug: CollectionSeoKey, lang: Lang): CollectionMeta {
  return lang === "ar" ? AR[slug] : EN[slug];
}

export function getCollectionBreadcrumbLabel(slug: CollectionSeoKey, lang: Lang): string {
  return getCollectionPageContent(slug, lang).pageTitle;
}
