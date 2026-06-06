import {
  getAnswerStyleInstruction,
  resolveAnswerStyle,
} from "@/lib/mr-brownie/answer-styles";

describe("Mr. Brownie answer styles", () => {
  it("auto maps sales personality to enthusiastic", () => {
    expect(
      resolveAnswerStyle({
        preference: "auto",
        personalityMode: "sales",
        crisisMode: false,
      }),
    ).toBe("enthusiastic");
  });

  it("auto maps support personality to calm", () => {
    expect(
      resolveAnswerStyle({
        preference: "auto",
        personalityMode: "support",
        crisisMode: false,
      }),
    ).toBe("calm");
  });

  it("forces calm in crisis even when user picks enthusiastic", () => {
    expect(
      resolveAnswerStyle({
        preference: "enthusiastic",
        personalityMode: "sales",
        crisisMode: true,
      }),
    ).toBe("calm");
  });

  it("softens enthusiastic to calm during support routing", () => {
    expect(
      resolveAnswerStyle({
        preference: "enthusiastic",
        personalityMode: "support",
        crisisMode: false,
      }),
    ).toBe("calm");
  });

  it("honours explicit concise style in friendly mode", () => {
    expect(
      resolveAnswerStyle({
        preference: "concise",
        personalityMode: "friendly",
        crisisMode: false,
      }),
    ).toBe("concise");
  });

  it("returns locale-specific instructions", () => {
    expect(getAnswerStyleInstruction("concise", "en")).toContain("CONCISE");
    expect(getAnswerStyleInstruction("concise", "ar")).toContain("مختصر");
  });
});
