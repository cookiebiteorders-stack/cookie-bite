/**
 * GA4 Event Tracking Architecture
 * Comprehensive e-commerce event tracking following GA4 Enhanced Measurement
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type Ga4EventName =
  | "view_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "purchase"
  | "view_item_list"
  | "select_item"
  | "view_cart"
  | "add_to_wishlist"
  | "remove_from_wishlist"
  | "search"
  | "generate_lead"
  | "login"
  | "sign_up"
  | "share"
  | "whatsapp_click"
  | "page_view";

export type Ga4Item = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  item_brand?: string;
};

export type Ga4EventParams = {
  currency?: string;
  value?: number;
  items?: Ga4Item[];
  item_list_id?: string;
  item_list_name?: string;
  search_term?: string;
  method?: string;
  content_type?: string;
  item_id?: string;
  content_id?: string;
};

export function trackGa4Event(
  name: Ga4EventName | string,
  params?: Record<string, string | number | boolean | undefined | Ga4Item[]>,
): void {
  if (typeof window === "undefined") return;
  
  const clean: Record<string, string | number | boolean | Ga4Item[]> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) clean[k] = v;
    }
  }
  
  if (process.env.NEXT_PUBLIC_GA_ID) {
    window.gtag?.("event", name, clean);
  }

  // Push to GTM dataLayer if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataLayer = (window as any).dataLayer = (window as any).dataLayer || [];
  dataLayer.push({
    event: name,
    ecommerce: name === "purchase" || name === "add_to_cart" || name === "begin_checkout" || name === "view_item" || name === "view_item_list" || name === "remove_from_cart" || name === "view_cart" || name === "select_item" ? clean : undefined,
    ...clean
  });
}

/**
 * Track product view (PDP view)
 */
export function trackViewItem(item: Ga4Item): void {
  trackGa4Event("view_item", { items: [item] });
}

/**
 * Track add to cart
 */
export function trackAddToCart(item: Ga4Item, value?: number): void {
  trackGa4Event("add_to_cart", { 
    items: [item], 
    value,
    currency: "EGP",
  });
}

/**
 * Track remove from cart
 */
export function trackRemoveFromCart(item: Ga4Item): void {
  trackGa4Event("remove_from_cart", { items: [item] });
}

/**
 * Track begin checkout
 */
export function trackBeginCheckout(items: Ga4Item[], value: number): void {
  trackGa4Event("begin_checkout", { 
    items, 
    value,
    currency: "EGP",
  });
}

/**
 * Track purchase
 */
export function trackPurchase(
  items: Ga4Item[], 
  value: number, 
  transactionId: string,
): void {
  trackGa4Event("purchase", { 
    items, 
    value,
    currency: "EGP",
    transaction_id: transactionId,
  });
}

/**
 * Track product list view (shop page, category page)
 */
export function trackViewItemList(items: Ga4Item[], listName: string): void {
  trackGa4Event("view_item_list", { 
    items, 
    item_list_name: listName,
  });
}

/**
 * Track product selection
 */
export function trackSelectItem(item: Ga4Item, listName?: string): void {
  trackGa4Event("select_item", { 
    items: [item], 
    item_list_name: listName,
  });
}

/**
 * Track view cart
 */
export function trackViewCart(items: Ga4Item[], value: number): void {
  trackGa4Event("view_cart", { 
    items, 
    value,
    currency: "EGP",
  });
}

/**
 * Track add to wishlist
 */
export function trackAddToWishlist(item: Ga4Item): void {
  trackGa4Event("add_to_wishlist", { items: [item] });
}

/**
 * Track remove from wishlist
 */
export function trackRemoveFromWishlist(item: Ga4Item): void {
  trackGa4Event("remove_from_wishlist", { items: [item] });
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string): void {
  trackGa4Event("search", { search_term: searchTerm });
}

/**
 * Track lead generation (contact form, etc.)
 */
export function trackGenerateLead(): void {
  trackGa4Event("generate_lead", {});
}

/**
 * Track login
 */
export function trackLogin(method: string): void {
  trackGa4Event("login", { method });
}

/**
 * Track sign up
 */
export function trackSignUp(method: string): void {
  trackGa4Event("sign_up", { method });
}

/**
 * Track share
 */
export function trackShare(contentType: string, itemId: string): void {
  trackGa4Event("share", { 
    content_type: contentType, 
    item_id: itemId,
  });
}

/**
 * Track WhatsApp click
 */
export function trackWhatsAppClick(source: string): void {
  trackGa4Event("whatsapp_click", { 
    content_type: "whatsapp",
    content_id: source,
  });
}

