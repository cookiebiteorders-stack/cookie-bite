import { checkoutSchema } from "@/lib/validations";

const minimalAddress = {
  full_name: "Test User",
  phone: "01012345678",
  governorate: "Cairo" as const,
  area: "Maadi",
  street: "Street 1",
  building: "1",
};

describe("checkoutSchema idempotency", () => {
  it("accepts optional idempotency_key UUID", () => {
    const parsed = checkoutSchema.safeParse({
      payment_method: "cod",
      cart_items: [{ product_id: "550e8400-e29b-41d4-a716-446655440001", quantity: 1 }],
      address: minimalAddress,
      idempotency_key: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.idempotency_key).toBe("550e8400-e29b-41d4-a716-446655440000");
    }
  });

  it("rejects invalid idempotency key", () => {
    const parsed = checkoutSchema.safeParse({
      payment_method: "cod",
      cart_items: [{ product_id: "550e8400-e29b-41d4-a716-446655440001", quantity: 1 }],
      address: minimalAddress,
      idempotency_key: "not-a-uuid",
    });
    expect(parsed.success).toBe(false);
  });
});
