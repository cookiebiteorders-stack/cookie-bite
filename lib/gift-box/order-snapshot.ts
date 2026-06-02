import { z } from "zod";
import type { GiftBoxBuilderState } from "@/lib/gift-box-builder/types";
import type { CartLine } from "@/lib/cart/types";

export const giftBoxSnapshotItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(99),
  price: z.number().nonnegative(),
  image: z.string().max(500).optional(),
});

export const giftBoxOrderSnapshotSchema = z.object({
  version: z.literal(1).default(1),
  boxSize: z.string().min(1).max(80),
  items: z.array(giftBoxSnapshotItemSchema).min(1),
  giftMessage: z.string().max(500).nullable().optional(),
  msgTo: z.string().max(120).optional(),
  msgFrom: z.string().max(120).optional(),
  msgText: z.string().max(500).optional(),
  cardDesign: z.string().max(40).optional(),
  ribbonColor: z.string().max(40).optional(),
  wrapStyle: z.string().max(40).optional(),
  occasion: z.string().max(80).nullable().optional(),
  image: z.string().max(500).optional(),
  totalItems: z.number().int().min(1),
  totalPrice: z.number().nonnegative(),
});

export type GiftBoxOrderSnapshot = z.infer<typeof giftBoxOrderSnapshotSchema>;

export type GiftBoxCartBuilderPayload = Partial<
  Pick<
    GiftBoxBuilderState,
    | "box"
    | "occasion"
    | "items"
    | "msgTo"
    | "msgFrom"
    | "msgText"
    | "cardDesign"
    | "ribbonColor"
    | "wrapStyle"
    | "delivery"
    | "surprise"
  >
>;

export function buildSnapshotFromCartLine(
  line: CartLine,
  builder?: GiftBoxCartBuilderPayload,
): GiftBoxOrderSnapshot | null {
  const gb = line.giftBox;
  if (!gb) return null;

  const items = gb.selected_products.map((sp) => ({
    productId: sp.product_id,
    name: sp.name ?? line.name,
    quantity: sp.quantity,
    price: sp.price_snapshot,
    image: sp.image,
  }));

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = gb.total_price;

  const snapshot: GiftBoxOrderSnapshot = {
    version: 1,
    boxSize: gb.box_size,
    items,
    giftMessage: gb.message ?? null,
    msgTo: builder?.msgTo,
    msgFrom: builder?.msgFrom,
    msgText: builder?.msgText ?? gb.message ?? undefined,
    cardDesign: builder?.cardDesign,
    ribbonColor: builder?.ribbonColor,
    wrapStyle: builder?.wrapStyle,
    occasion: builder?.occasion ?? null,
    image: line.image,
    totalItems,
    totalPrice,
  };

  const parsed = giftBoxOrderSnapshotSchema.safeParse(snapshot);
  return parsed.success ? parsed.data : null;
}

export function builderStateFromSnapshot(snapshot: GiftBoxOrderSnapshot): GiftBoxBuilderState {
  const items: Record<string, number> = {};
  for (const row of snapshot.items) {
    items[row.productId] = row.quantity;
  }
  return {
    currentStep: 2,
    box: snapshot.boxSize,
    occasion: snapshot.occasion ?? null,
    items,
    msgTo: snapshot.msgTo ?? "",
    msgFrom: snapshot.msgFrom ?? "",
    msgText: snapshot.msgText ?? snapshot.giftMessage ?? "",
    cardDesign: snapshot.cardDesign ?? "birthday",
    ribbonColor: snapshot.ribbonColor ?? "gold",
    wrapStyle: snapshot.wrapStyle ?? "kraft",
    delivery: "sameday",
    surprise: false,
    activeFilter: "All",
  };
}

export function parseGiftBoxSnapshot(raw: unknown): GiftBoxOrderSnapshot | null {
  const parsed = giftBoxOrderSnapshotSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
