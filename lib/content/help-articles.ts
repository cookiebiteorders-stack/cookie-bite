export type HelpArticleSection = {
  heading: string;
  paragraphs: string[];
};

export type HelpArticleContent = {
  title: string;
  description: string;
  path: string;
  keywords: string[];
  sections: HelpArticleSection[];
  relatedLinks: Array<{ href: string; label: string }>;
};

export const HELP_DELIVERY: HelpArticleContent = {
  title: "Cookie Delivery in New Cairo",
  description:
    "Learn how Cookie Bite schedules delivery across New Cairo, free shipping thresholds, and how to confirm your compound.",
  path: "/help/delivery",
  keywords: ["cookie delivery cairo", "new cairo delivery times", "cookie bite shipping"],
  sections: [
    {
      heading: "Where we deliver",
      paragraphs: [
        "Cookie Bite delivers from our kitchen in Fifth Settlement, New Cairo across most compounds and neighborhoods in New Cairo and nearby areas.",
        "Delivery windows depend on daily bake capacity and your zone. Message us on WhatsApp before checkout if you need a specific date.",
      ],
    },
    {
      heading: "Timing & scheduling",
      paragraphs: [
        "Most orders ship within 1–2 days after confirmation. Peak weekends and holidays may require earlier ordering.",
        "You will receive email confirmation after checkout with order details. For live updates, contact us on WhatsApp.",
      ],
    },
    {
      heading: "Free delivery",
      paragraphs: [
        "Enjoy free delivery on qualifying orders over {threshold} EGP before discounts, subject to zone availability. The checkout page shows fees for your address.",
      ],
    },
  ],
  relatedLinks: [
    { href: "/delivery/new-cairo", label: "New Cairo delivery guide" },
    { href: "/delivery/areas", label: "Delivery areas list" },
    { href: "/help/faq", label: "FAQ" },
  ],
};

export const HELP_ALLERGENS: HelpArticleContent = {
  title: "Allergens & Ingredients",
  description:
    "Understand common allergens in Cookie Bite cookies — gluten, dairy, eggs, nuts — and how to read packaging labels.",
  path: "/help/allergens",
  keywords: ["cookie allergens egypt", "nut free cookies cairo", "ingredient list cookie bite"],
  sections: [
    {
      heading: "Common allergens",
      paragraphs: [
        "Our cookies are baked in a kitchen that handles wheat (gluten), dairy, eggs, soy, and tree nuts. Cross-contact may occur despite careful preparation.",
        "Stuffed and premium flavors may include chocolate, nuts, or spreads such as hazelnut. Always check the flavor description before ordering.",
      ],
    },
    {
      heading: "Ingredient transparency",
      paragraphs: [
        "Full ingredient lists are printed on packaging for every box. If you are ordering for an event or school, contact us for batch-specific details.",
        "We do not currently offer fully gluten-free or vegan lines unless labeled on the product page.",
      ],
    },
    {
      heading: "Need a custom batch?",
      paragraphs: [
        "For corporate or celebration orders with dietary requirements, reach out before your event date so we can advise on feasible options.",
      ],
    },
  ],
  relatedLinks: [
    { href: "/help/faq", label: "FAQ" },
    { href: "/contact", label: "Contact us" },
  ],
};

export const HELP_PAYMENTS: HelpArticleContent = {
  title: "Payments & Checkout",
  description:
    "Payment methods for Cookie Bite online orders — cards, cash on delivery where available, and troubleshooting declined payments.",
  path: "/help/payments",
  keywords: ["cookie bite payment", "cod cookies cairo", "online cookie checkout egypt"],
  sections: [
    {
      heading: "Accepted methods",
      paragraphs: [
        "We accept secure card payments online through our checkout partner. Cash on delivery may appear for eligible New Cairo addresses.",
        "Available methods are shown at checkout after you enter your delivery details — they can vary by zone.",
      ],
    },
    {
      heading: "If your card is declined",
      paragraphs: [
        "Double-check your billing address and try again. Some banks require enabling online purchases for Egyptian merchants.",
        "You can switch to cash on delivery when offered, or message us on WhatsApp to complete the order manually.",
      ],
    },
    {
      heading: "Invoices & receipts",
      paragraphs: [
        "Order confirmation is emailed after successful payment. Account holders can review past orders from the dashboard.",
      ],
    },
  ],
  relatedLinks: [
    { href: "/help/faq", label: "FAQ" },
    { href: "/account/orders", label: "My orders" },
  ],
};

export const HELP_GIFTING: HelpArticleContent = {
  title: "Cookie Gifting Guide",
  description:
    "Plan cookie gift boxes for birthdays, weddings, corporate events, and seasonal celebrations in New Cairo.",
  path: "/help/gifting",
  keywords: ["cookie gift guide cairo", "birthday cookie gifts", "corporate cookie boxes egypt"],
  sections: [
    {
      heading: "Choosing the right box",
      paragraphs: [
        "Start with our curated gift boxes for classic celebrations, or build a custom assortment from the shop.",
        "Consider dietary preferences and whether your recipient prefers stuffed, chocolate-forward, or classic flavors.",
      ],
    },
    {
      heading: "Gift notes & presentation",
      paragraphs: [
        "Add a handwritten-style gift note with eligible gift boxes. Ribbons and seasonal sleeves rotate throughout the year.",
      ],
    },
    {
      heading: "Corporate & bulk",
      paragraphs: [
        "For team gifts, client thank-yous, or event favors, visit our corporate gifting page for branding options and lead times.",
      ],
    },
  ],
  relatedLinks: [
    { href: "/gift-box", label: "Gift boxes" },
    { href: "/corporate-gifting", label: "Corporate gifting" },
    { href: "/gift-ideas", label: "Gift ideas" },
  ],
};
