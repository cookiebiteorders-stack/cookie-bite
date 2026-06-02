import { buildAbandonedCartSnapshot, cartValueFromSnapshot } from "@/lib/cart/abandoned";
import { buildRecoveryDiscountCode } from "@/lib/cart/recovery-discount";
import { giftBoxLine, lineFromProduct } from "@/lib/cart/types";
import type { Product } from "@/lib/data";

describe("abandoned cart", () => {
  it("builds snapshot and cart value from lines", () => {
    const product: Product = {
      id: "cookie-classic",
      productUuid: "550e8400-e29b-41d4-a716-446655440000",
      name: "Classic Cookie",
      description: "Test cookie",
      price: 120,
      image: "/cookie.png",
      category: "cookies",
      stock: 10,
    };

    const snapshot = buildAbandonedCartSnapshot([lineFromProduct(product, 2)]);
    expect(snapshot).not.toBeNull();
    expect(cartValueFromSnapshot(snapshot!)).toBe(240);
    expect(snapshot?.lines[0]?.quantity).toBe(2);
  });

  it("includes gift box lines in snapshot value", () => {
    const line = giftBoxLine({
      id: "custom",
      name: "Gift Box",
      image: "/box.png",
      boxSize: "medium",
      selectedProducts: [
        {
          product_id: "550e8400-e29b-41d4-a716-446655440000",
          quantity: 3,
          price_snapshot: 50,
        },
      ],
      totalPrice: 150,
    });
    const snapshot = buildAbandonedCartSnapshot([line]);
    expect(snapshot?.subtotalEgp).toBe(150);
  });

  it("builds deterministic recovery discount code prefix", () => {
    const code = buildRecoveryDiscountCode("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(code.startsWith("BACK")).toBe(true);
    expect(code.length).toBeGreaterThanOrEqual(10);
  });
});
