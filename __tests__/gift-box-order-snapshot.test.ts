import { buildSnapshotFromCartLine, parseGiftBoxSnapshot } from "@/lib/gift-box/order-snapshot";
import { giftBoxLine } from "@/lib/cart/types";

describe("gift box order snapshot", () => {
  it("builds snapshot from cart gift box line", () => {
    const line = giftBoxLine({
      id: "custom",
      name: "Custom Gift Box",
      image: "/box.png",
      boxSize: "medium",
      selectedProducts: [
        {
          product_id: "550e8400-e29b-41d4-a716-446655440000",
          quantity: 2,
          price_snapshot: 50,
          name: "Cookie A",
        },
      ],
      message: "Happy day",
      totalPrice: 100,
    });

    const snapshot = buildSnapshotFromCartLine(line);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.totalItems).toBe(2);
    expect(snapshot?.totalPrice).toBe(100);
    expect(snapshot?.boxSize).toBe("medium");
    expect(parseGiftBoxSnapshot(snapshot)).toEqual(snapshot);
  });
});
