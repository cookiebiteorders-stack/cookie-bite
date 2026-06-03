import type { BuilderProduct } from "@/lib/gift-box-builder/data";
import type { GiftBoxBuilderState } from "@/lib/gift-box-builder/types";
import { getItemsTotal } from "@/lib/gift-box-builder/utils";
import type { CreateGiftBoxShareInput } from "@/lib/gift-box/share";

export function buildShareInputFromBuilder(
  state: GiftBoxBuilderState,
  products: BuilderProduct[],
): CreateGiftBoxShareInput | null {
  if (!state.box) return null;
  const entries = Object.entries(state.items).filter(([, qty]) => qty > 0);
  if (!entries.length) return null;

  return {
    box_size: state.box,
    items: entries.map(([product_id, quantity]) => ({ product_id, quantity })),
    gift_message: state.msgText?.trim() || null,
    ribbon_color: state.ribbonColor ?? "gold",
    has_wrapping: true,
    total_price: getItemsTotal(state.items, products),
  };
}
