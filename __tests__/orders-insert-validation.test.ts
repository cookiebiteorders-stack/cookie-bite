import {
  buildOrderItemInsertRow,
  type CheckoutOrderLineInput,
} from "@/lib/db/build-order-item-insert";

describe("order_items schema and validation tests", () => {
  it("builds canonical order item row with required slug, names, and prices", () => {
    const line: CheckoutOrderLineInput = {
      slug: "nutella-cookie-box",
      name: "Nutella Stuffed Cookie Box (6)",
      unitPrice: 180,
      quantity: 3,
      finalUnitPrice: 180,
    };

    const row = buildOrderItemInsertRow("order-uuid-123", line, "product-uuid-456");

    expect(row.order_id).toBe("order-uuid-123");
    expect(row.product_id).toBe("product-uuid-456");
    expect(row.product_name).toBe("Nutella Stuffed Cookie Box (6)");
    expect(row.slug).toBe("nutella-cookie-box");
    expect(row.unit_price_egp).toBe(180);
    expect(row.unit_price).toBe(180);
    expect(row.quantity).toBe(3);
    expect(row.total_price_egp).toBe(540);
    expect(row.total_price).toBe(540);
  });

  it("handles custom gift boxes with skipProductLookup and null product_id", () => {
    const giftBoxLine: CheckoutOrderLineInput = {
      slug: "gift-box:custom",
      name: "Custom Gift Box (12 Cookies)",
      unitPrice: 450,
      quantity: 1,
      finalUnitPrice: 450,
      productSnapshot: { type: "gift_box", snapshot: { itemsCount: 12 } },
    };

    const row = buildOrderItemInsertRow("order-uuid-789", giftBoxLine, null);

    expect(row.order_id).toBe("order-uuid-789");
    expect(row.product_id).toBeNull();
    expect(row.product_name).toBe("Custom Gift Box (12 Cookies)");
    expect(row.slug).toBe("gift-box:custom");
    expect(row.unit_price_egp).toBe(450);
    expect(row.quantity).toBe(1);
    expect(row.total_price_egp).toBe(450);
  });

  it("handles add-ons and variants correctly", () => {
    const lineWithAddons: CheckoutOrderLineInput = {
      slug: "triple-chocolate-cookie",
      name: "Triple Chocolate Cookie",
      unitPrice: 50,
      quantity: 4,
      finalUnitPrice: 65,
      addonsTotalUnitPrice: 15,
      selectedAddons: [{ addon_id: "extra-dip", price_egp: 15 }],
      variantId: "variant-uuid-999",
      variantSnapshot: { name: "Double Size", price_egp: 65 },
    };

    const row = buildOrderItemInsertRow("order-uuid-111", lineWithAddons, "prod-uuid-222");

    expect(row.order_id).toBe("order-uuid-111");
    expect(row.product_id).toBe("prod-uuid-222");
    expect(row.slug).toBe("triple-chocolate-cookie");
    expect(row.variant_id).toBe("variant-uuid-999");
    expect(row.variant_snapshot).toEqual({ name: "Double Size", price_egp: 65 });
    expect(row.total_price_egp).toBe(260); // 65 * 4
    expect(row.addons_total_egp).toBe(60); // 15 * 4
  });

  it("fails validation if required fields like slug are missing", () => {
    const invalidLine = {
      slug: "",
      name: "Invalid Item",
      unitPrice: 100,
      quantity: 1,
    } as CheckoutOrderLineInput;

    const row = buildOrderItemInsertRow("order-uuid-000", invalidLine, "prod-000");
    expect(row.slug).toBe("");
  });
});
