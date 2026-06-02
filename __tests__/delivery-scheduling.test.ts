import {
  checkoutDeliverySchema,
  emptyDeliveryScheduling,
  stateToPayload,
  validateDeliverySchedulingClient,
} from "@/lib/checkout/delivery-scheduling";

describe("delivery scheduling", () => {
  it("requires date and slot", () => {
    const err = validateDeliverySchedulingClient(emptyDeliveryScheduling(), "en");
    expect(err).toContain("delivery date");
  });

  it("validates gift recipient fields", () => {
    const state = {
      ...emptyDeliveryScheduling(),
      deliveryDate: "2026-06-15",
      slotId: "fallback-morning",
      slotLabel: "Morning",
      isGift: true,
    };
    const err = validateDeliverySchedulingClient(state, "en");
    expect(err).toBeTruthy();
  });

  it("accepts complete gift delivery payload", () => {
    const payload = stateToPayload({
      ...emptyDeliveryScheduling(),
      deliveryDate: "2026-06-15",
      slotId: "fallback-morning",
      slotLabel: "Morning",
      isGift: true,
      recipientName: "Sara",
      recipientPhone: "01012345678",
      recipientStreet: "Street 1",
      recipientDistrict: "Fifth Settlement",
      recipientCity: "New Cairo",
      senderName: "Ali",
      giftMessage: "Happy birthday",
    });
    expect(checkoutDeliverySchema.safeParse(payload).success).toBe(true);
  });
});
