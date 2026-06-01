import { BRAND } from "@/lib/brand";
import { GIFT_BOX_BUILDER_DATA, type BuilderProduct } from "@/lib/gift-box-builder/data";
import type { GiftBoxBuilderState } from "@/lib/gift-box-builder/types";

export function formatBuilderPrice(amount: number): string {
  return `${Math.round(amount).toLocaleString()} ${BRAND.currency}`;
}

export function getBoxCapacity(boxId: string | null): number {
  const box = GIFT_BOX_BUILDER_DATA.boxes.find((b) => b.id === boxId);
  return box?.capacity ?? 0;
}

export function getTotalItems(items: Record<string, number>): number {
  return Object.values(items).reduce((a, b) => a + b, 0);
}

export function getItemsTotal(
  items: Record<string, number>,
  products: BuilderProduct[],
): number {
  return Object.entries(items).reduce((sum, [id, qty]) => {
    const p = products.find((x) => x.id === id);
    return sum + (p ? p.price * qty : 0);
  }, 0);
}

/** Box packaging is free — total = sum of treats + delivery. */
export function getGrandTotal(state: GiftBoxBuilderState, products: BuilderProduct[]): number {
  const delivery = GIFT_BOX_BUILDER_DATA.deliveryOptions.find((d) => d.id === state.delivery);
  return getItemsTotal(state.items, products) + (delivery?.price ?? 0);
}

export function getDeliveryFee(state: GiftBoxBuilderState): number {
  const delivery = GIFT_BOX_BUILDER_DATA.deliveryOptions.find((d) => d.id === state.delivery);
  return delivery?.price ?? 0;
}

export function trimItemsToCapacity(
  items: Record<string, number>,
  cap: number,
): Record<string, number> {
  let count = 0;
  const trimmed: Record<string, number> = {};
  for (const [id, qty] of Object.entries(items)) {
    if (count >= cap) break;
    const allowed = Math.min(qty, cap - count);
    trimmed[id] = allowed;
    count += allowed;
  }
  return trimmed;
}

export function findNextLargerBox(currentBoxId: string | null) {
  const current = GIFT_BOX_BUILDER_DATA.boxes.find((b) => b.id === currentBoxId);
  if (!current) return GIFT_BOX_BUILDER_DATA.boxes[0];
  return GIFT_BOX_BUILDER_DATA.boxes.find((b) => b.capacity > current.capacity);
}

export function buildGiftMessagePayload(state: GiftBoxBuilderState): string {
  return JSON.stringify({
    to: state.msgTo,
    from: state.msgFrom,
    text: state.msgText,
    occasion: state.occasion,
    cardDesign: state.cardDesign,
    wrapStyle: state.wrapStyle,
    delivery: state.delivery,
    surprise: state.surprise,
    boxId: state.box,
  });
}
