import { validatePromoForCart } from "@/lib/promo/validate-promo";

const basePromo = {
  id: "p1",
  code: "SAVE10",
  type: "percent" as const,
  value: 10,
  min_order_amount_egp: 100,
  max_uses: 5,
  used_count: 0,
  is_active: true,
  valid_from: new Date(Date.now() - 86400000).toISOString(),
  valid_until: null,
};

describe("validatePromoForCart", () => {
  it("accepts valid percent promo", () => {
    const result = validatePromoForCart(basePromo, 500);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.discount_amount).toBe(50);
  });

  it("rejects below minimum order", () => {
    const result = validatePromoForCart(basePromo, 50);
    expect(result.valid).toBe(false);
  });

  it("rejects expired promo", () => {
    const result = validatePromoForCart(
      {
        ...basePromo,
        valid_until: new Date(Date.now() - 1000).toISOString(),
      },
      500,
    );
    expect(result.valid).toBe(false);
  });

  it("caps fixed discount at subtotal", () => {
    const result = validatePromoForCart(
      { ...basePromo, type: "fixed", value: 200 },
      150,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.discount_amount).toBe(150);
  });
});
