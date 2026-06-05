import type { Lang } from "@/lib/i18n/translations";
import { siteConfig } from "@/lib/site-config";

export type ProactiveSellingContext = {
  locale: Lang;
  cartItems: number;
  cartSubtotalEgp: number;
  /** ثوانٍ على صفحة منتج */
  pdpDwellSeconds?: number;
  productSlug?: string | null;
  productName?: string | null;
  /** سلة فيها منتجات لكن بدون نشاط حديث (تقريبي من العميل) */
  cartIdleMinutes?: number;
};

export function buildProactiveSellingLine(ctx: ProactiveSellingContext): string | null {
  const ar = ctx.locale === "ar";
  const freeThreshold = siteConfig.freeDeliveryThresholdEgp;
  const gap = Math.max(0, freeThreshold - ctx.cartSubtotalEgp);

  if (ctx.cartItems > 0 && ctx.cartIdleMinutes != null && ctx.cartIdleMinutes >= 30) {
    return ar
      ? "🛒 سلتك لسه موجودة — تحب نكمّل الطلب قبل ما الكوكيز تتوهق؟"
      : "🛒 Your cart is still here — want to finish checkout before it gets lonely?";
  }

  if (
    ctx.pdpDwellSeconds != null &&
    ctx.pdpDwellSeconds >= 45 &&
    ctx.productName?.trim()
  ) {
    return ar
      ? `👀 شايف إنك باصص على ${ctx.productName} — تحب أضيفه للسلة؟`
      : `👀 You've been eyeing ${ctx.productName} — want me to add it to your cart?`;
  }

  if (ctx.cartItems > 0 && gap > 0 && gap <= 120) {
    return ar
      ? `🚚 فاضل ${Math.round(gap)} جنيه بس للشحن المجاني — نزوّد السلة؟`
      : `🚚 Only ${Math.round(gap)} EGP to free delivery — add something small?`;
  }

  return null;
}
