export type MrBrowniePageIntent =
  | "home"
  | "shop"
  | "product_detail"
  | "gift_box"
  | "gift_builder"
  | "cart"
  | "checkout"
  | "account"
  | "help"
  | "other";

export type MrBrownieSessionContext = {
  pathname: string;
  page_intent: MrBrowniePageIntent;
  product_slug: string | null;
  locale: "ar" | "en" | "auto";
  focus_hint: string;
};

export function resolvePageIntent(pathname: string, productSlug?: string | null): MrBrownieSessionContext {
  const path = pathname || "/";
  let page_intent: MrBrowniePageIntent = "other";
  let focus_hint =
    "General browsing — ask what they need (gift, flavor, delivery) and use CONTEXT.products.";

  if (path === "/" || path === "") {
    page_intent = "home";
    focus_hint = "Homepage — highlight bestsellers from CONTEXT.products and gift paths (/gift-box, /gift-box/build).";
  } else if (path.startsWith("/shop/") && path !== "/shop") {
    page_intent = "product_detail";
    focus_hint =
      "Product page — help compare this item to alternatives; mention add-to-cart and pairing ideas.";
  } else if (path === "/shop" || path.startsWith("/collections/") || path.startsWith("/our-cookies")) {
    page_intent = "shop";
    focus_hint = "Catalog browsing — narrow by category, budget, or occasion; cite real SKUs from CONTEXT.";
  } else if (path.startsWith("/gift-box/build")) {
    page_intent = "gift_builder";
    focus_hint =
      "Gift box builder — guide box size, mix of flavors, message card; do not invent items not in CONTEXT.products.";
  } else if (path.startsWith("/gift-box") || path.startsWith("/gift-ideas")) {
    page_intent = "gift_box";
    focus_hint = "Gifting flow — occasion-first recommendations; suggest /gift-box/build for custom mix.";
  } else if (path === "/cart") {
    page_intent = "cart";
    focus_hint = "Cart — summarize CONTEXT.cart, free-shipping gap, suggest add-ons from CONTEXT.products.";
  } else if (path.startsWith("/account")) {
    page_intent = "account";
    focus_hint = "Account area — orders/loyalty; use CONTEXT.memory.recent_orders when present.";
  } else if (path.startsWith("/help")) {
    page_intent = "help";
    focus_hint = "Help center — prioritize knowledge_base.faq; link deeper help articles when relevant.";
  }

  const slugFromPath =
    page_intent === "product_detail"
      ? path.replace(/^\/shop\//, "").split("/")[0] || null
      : null;

  return {
    pathname: path,
    page_intent,
    product_slug: productSlug?.trim() || slugFromPath,
    locale: "auto",
    focus_hint,
  };
}
