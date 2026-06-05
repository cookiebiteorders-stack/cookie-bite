import { extractPromoCodeFromMessage } from "@/lib/mr-brownie/brain/commerce-tools";

describe("Mr. Brownie commerce tools", () => {
  it("extracts labeled promo code", () => {
    expect(extractPromoCodeFromMessage("عايز كود SAVE10")).toBe("SAVE10");
    expect(extractPromoCodeFromMessage("promo: WELCOME")).toBe("WELCOME");
  });

  it("returns null when no code pattern", () => {
    expect(extractPromoCodeFromMessage("مرحبا")).toBeNull();
  });
});
