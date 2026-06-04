import { ACCOUNT_HELP_ARTICLES } from "@/lib/content/help-center/account-articles";
import { RETURNS_HELP_ARTICLES } from "@/lib/content/help-center/returns-articles";
import { ORDERS_HELP_ARTICLES } from "@/lib/content/help-center/orders-articles";
import { GIFTING_HELP_ARTICLES } from "@/lib/content/help-center/gifting-articles";
import { PRODUCTS_HELP_ARTICLES } from "@/lib/content/help-center/products-articles";
import { PAYMENT_HELP_ARTICLES } from "@/lib/content/help-center/payment-articles";
import type { HelpCenterArticle, HelpCenterCategoryId } from "@/lib/content/help-center/types";

export type { HelpCenterArticle, HelpCenterBlock, HelpCenterCategoryId, Localized } from "@/lib/content/help-center/types";

/** Article keys used on /help hub — maps to catalog ids from CookieBiteArticles */
export type HelpCenterArticleKey =
  | "trackOrder"
  | "deliveryZones"
  | "freeShipping"
  | "deliveryTime"
  | "changeAddress"
  | "cancelOrder"
  | "damagedOrder"
  | "wrongItem"
  | "refundTime"
  | "returnsPolicy"
  | "createAccount"
  | "resetPassword"
  | "socialLogin"
  | "updateProfile"
  | "deleteAccount"
  | "paymentMethods"
  | "codAvailable"
  | "cardDeclined"
  | "downloadInvoice"
  | "promoCode"
  | "ingredients"
  | "allergens"
  | "storage"
  | "shelfLife"
  | "giftNotes"
  | "giftBoxes"
  | "corporate"
  | "customCookies";

export const HELP_ARTICLE_KEY_TO_ID: Record<HelpCenterArticleKey, string> = {
  trackOrder: "o1",
  deliveryZones: "o2",
  freeShipping: "o2",
  deliveryTime: "o2",
  changeAddress: "o3",
  cancelOrder: "o4",
  damagedOrder: "r2",
  wrongItem: "r1",
  refundTime: "r4",
  returnsPolicy: "r4",
  createAccount: "a1",
  resetPassword: "a2",
  socialLogin: "a1",
  updateProfile: "a3",
  deleteAccount: "a4",
  paymentMethods: "pay1",
  codAvailable: "pay1",
  cardDeclined: "pay4",
  downloadInvoice: "pay2",
  promoCode: "pay3",
  ingredients: "p1",
  allergens: "p2",
  storage: "p3",
  shelfLife: "p4",
  giftNotes: "g1",
  giftBoxes: "g2",
  corporate: "g3",
  customCookies: "g4",
};

export const HELP_CENTER_ARTICLES: HelpCenterArticle[] = [
  ...ACCOUNT_HELP_ARTICLES,
  ...RETURNS_HELP_ARTICLES,
  ...ORDERS_HELP_ARTICLES,
  ...GIFTING_HELP_ARTICLES,
  ...PRODUCTS_HELP_ARTICLES,
  ...PAYMENT_HELP_ARTICLES,
];

const byId = new Map(HELP_CENTER_ARTICLES.map((a) => [a.id, a]));

export function helpArticlePath(id: string): string {
  return `/help/articles/${id}`;
}

export function getHelpArticleById(id: string): HelpCenterArticle | undefined {
  return byId.get(id);
}

export function getHelpArticlesByCategory(categoryId: HelpCenterCategoryId): HelpCenterArticle[] {
  return HELP_CENTER_ARTICLES.filter((a) => a.categoryId === categoryId);
}

export function getAllHelpArticleIds(): string[] {
  return HELP_CENTER_ARTICLES.map((a) => a.id);
}

export function helpArticlePathForKey(key: HelpCenterArticleKey): string {
  if (key === "returnsPolicy") return "/help/returns";
  return helpArticlePath(HELP_ARTICLE_KEY_TO_ID[key]);
}
