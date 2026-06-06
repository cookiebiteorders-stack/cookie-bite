import { trackGa4Event } from "@/lib/analytics/ga4";

export type MrBrownieFunnelStep =
  | "chat_open"
  | "chat_message"
  | "assistant_reply"
  | "product_card_click"
  | "action_card_click"
  | "feedback_up"
  | "feedback_down"
  | "chip_click"
  | "gift_guide_start"
  | "gift_guide_complete"
  | "add_to_cart_from_chat"
  | "promo_apply_from_chat";

/** قمع GA4 لشات Mr. Brownie — بديل خفيف لـ Mixpanel/PostHog. */
export function trackMrBrownieFunnel(
  step: MrBrownieFunnelStep,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  trackGa4Event("mr_brownie_funnel", { funnel_step: step, ...params });
}
