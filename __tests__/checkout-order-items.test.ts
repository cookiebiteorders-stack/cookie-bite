import {
  buildOrderItemInsertRow,
  type CheckoutOrderLineInput,
} from "@/lib/db/build-order-item-insert";

describe("buildOrderItemInsertRow", () => {
  const baseLine: CheckoutOrderLineInput = {
    slug: "classic-cookie-box",
    name: "Classic Cookie Box (12)",
    unitPrice: 250,
    quantity: 2,
    finalUnitPrice: 280,
    addonsTotalUnitPrice: 30,
    selectedAddons: [{ addon_id: "a1", options: [] }],
  };

  it("uses canonical order_items columns", () => {
    const row = buildOrderItemInsertRow("order-uuid", baseLine, "product-uuid");
    expect(row).toMatchObject({
      order_id: "order-uuid",
      product_id: "product-uuid",
      product_name: "Classic Cookie Box (12)",
      slug: "classic-cookie-box",
      unit_price_egp: 250,
      quantity: 2,
      total_price_egp: 560,
      final_total_egp: 560,
      addons_total_egp: 60,
    });
    expect(row.slug).toBe("classic-cookie-box");
    expect(row).not.toHaveProperty("name");
  });

  it("allows null product_id for custom gift box lines", () => {
    const giftLine: CheckoutOrderLineInput = {
      slug: "gift-box:custom",
      name: "Custom Gift Box",
      unitPrice: 500,
      quantity: 1,
      productSnapshot: { type: "gift_box", snapshot: { totalItems: 6 } },
      skipProductLookup: true,
    } as CheckoutOrderLineInput & { skipProductLookup?: boolean };

    const row = buildOrderItemInsertRow("order-uuid", giftLine, null);
    expect(row.product_id).toBeNull();
    expect(row.product_name).toBe("Custom Gift Box");
    expect(row.product_snapshot).toMatchObject({
      type: "gift_box",
      slug: "gift-box:custom",
    });
  });

  it("stores variant snapshot when present", () => {
    const row = buildOrderItemInsertRow("order-uuid", {
      ...baseLine,
      variantId: "variant-uuid",
      variantSnapshot: { label: "Large", price_egp: 280 },
    }, "product-uuid");

    expect(row.variant_id).toBe("variant-uuid");
    expect(row.variant_snapshot).toEqual({ label: "Large", price_egp: 280 });
  });
});
