/** Page-aware quick prompts for Mrs. Cookie (admin copilot). */

export function copilotSuggestionsForPath(path: string, lang: "en" | "ar"): string[] {
  const p = path.toLowerCase();

  if (p.includes("/admin/products")) {
    return lang === "ar"
      ? [
          "ضيف منتج كوكيز شوكولاتة فاخر",
          "غيّر سعر منتج لـ 250 جنيه",
          "ما المنتجات اللي مخزونها أقل من 5؟",
          "حسّن أوصاف المنتجات الضعيفة",
        ]
      : [
          "Add a luxury dark chocolate cookie product",
          "Change a product price to 250 EGP",
          "Which products are below 5 in stock?",
          "Improve weak product descriptions",
        ];
  }

  if (p.includes("/admin/orders")) {
    return lang === "ar"
      ? [
          "اعرض الطلبات الجديدة اليوم",
          "حدّث الطلبات المعلّقة إلى processing",
          "اعرض تفاصيل آخر طلب",
          "كم طلب pending الآن؟",
        ]
      : [
          "Show new orders from today",
          "Move pending orders to processing",
          "Show the latest order details",
          "How many pending orders now?",
        ];
  }

  if (p.includes("/admin/customers")) {
    return lang === "ar"
      ? [
          "اعرض عملاء VIP",
          "من لم يطلب منذ 90 يوم؟",
          "ابحث عن عميل بالبريد",
          "اقترح حملة لعملاء غير نشطين",
        ]
      : [
          "Show VIP customers",
          "Who hasn't ordered in 90 days?",
          "Find customer by email",
          "Suggest a win-back campaign",
        ];
  }

  if (p.includes("/admin/discounts")) {
    return lang === "ar"
      ? [
          "اعمل خصم 20% لمدة أسبوع",
          "اعرض أكواد الخصم النشطة",
          "أنشئ كود WELCOME10",
          "ما أكثر كود استخداماً؟",
        ]
      : [
          "Create 20% off for one week",
          "List active promo codes",
          "Create code WELCOME10",
          "Which code is used most?",
        ];
  }

  if (p.includes("/admin/financial") || p.includes("/admin/reports")) {
    return lang === "ar"
      ? [
          "تقرير مبيعات آخر 30 يوم",
          "كيف يسير يومنا؟",
          "قارن الإيرادات بالأسبوع الماضي",
          "أفضل 5 منتجات مبيعاً",
        ]
      : [
          "Sales report last 30 days",
          "How is today going?",
          "Compare revenue vs last week",
          "Top 5 bestsellers",
        ];
  }

  return lang === "ar"
    ? [
        "كيف يسير يومنا؟",
        "ضيف منتج كوكيز فاخر",
        "اعرض الطلبات المعلّقة",
        "اعمل خصم 15% لمدة أسبوع",
        "أفضل 5 منتجات هذا الشهر",
      ]
    : [
        "How is today going?",
        "Add a premium cookie product",
        "Show pending orders",
        "Create 15% off for one week",
        "Top 5 products this month",
      ];
}
