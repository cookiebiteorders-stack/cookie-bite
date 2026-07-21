import type { UserRole } from "@/lib/admin/rbac";

/**
 * طبقة الأفعال — ما يستطيع المساعد توجيه المستخدم إليه (Agent hints).
 * التنفيذ الفعلي يبقى على الموقع؛ البوت لا ينفّذ دفعاً أو طلبات مباشرة.
 */
export function buildMrBrownieAgentCapabilities(role: UserRole | "guest") {
  const shared = {
    mode: "guide_and_recommend" as const,
    cannot_do: [
      "Place or modify orders directly",
      "Apply promo codes without user entering at checkout",
      "Access payment card data",
      "Change user passwords or RBAC",
    ],
  };

  if (role === "guest" || role === "customer") {
    return {
      ...shared,
      can_guide: [
        { action: "browse_catalog", path: "/shop", when: "User wants to explore products" },
        { action: "open_product", path: "/shop/{slug}", when: "Recommend a specific SKU from CONTEXT.products" },
        { action: "build_gift_box", path: "/gift-box/build", when: "Custom gift box / pick flavors" },
        { action: "gift_boxes", path: "/gift-box", when: "Ready-made gift boxes" },
        { action: "mystery_box", path: "/mystery-box", when: "Surprise / fun gift" },
        { action: "view_cart", path: "/cart", when: "Review cart or checkout readiness" },
        { action: "checkout", path: "/cart", when: "User ready to pay" },
        { action: "track_order", path: "/track", when: "Order status question" },
        { action: "account_orders", path: "/account/orders", when: "Signed-in order history" },
        { action: "help_faq", path: "/help", when: "Delivery, returns, allergens" },
        { action: "whatsapp", channel: "whatsapp", when: "Urgent or address-specific delivery" },
      ],
      multi_step_flows: [
        {
          id: "gift_box_consult",
          steps: ["clarify occasion + budget", "suggest 2–3 products or /gift-box/build", "mention card note + delivery threshold"],
        },
        {
          id: "product_fit",
          steps: ["clarify taste/occasion", "match CONTEXT.products", "offer shop_path link"],
        },
      ],
    };
  }

  return {
    ...shared,
    can_guide: [
      { action: "admin_dashboard", path: "/admin", when: "KPIs and overview" },
      { action: "admin_orders", path: "/admin/orders", when: "Order queue" },
      { action: "admin_products", path: "/admin/products", when: "Catalog edits" },
      { action: "admin_copilot", path: "/admin/copilot", when: "Deep ops with Mrs. Cookie tools" },
    ],
    note: "For write actions in admin, user must confirm in dashboard; chat advises only unless using admin copilot tools.",
  };
}
