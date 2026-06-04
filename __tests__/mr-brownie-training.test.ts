jest.mock("@/lib/supabase/admin", () => ({
  tryCreateSupabaseAdminClient: () => null,
}));

import { detectTrainingIntent } from "@/lib/mr-brownie/training/detect-intent";
import { loadFewShotExamplesForChat } from "@/lib/mr-brownie/training/load-few-shot";
import { MR_BROWNIE_TRAINING_TEST_CASES } from "@/lib/mr-brownie/training/test-cases";

describe("Mr. Brownie training", () => {
  it("detects intents for QA cases", () => {
    for (const tc of MR_BROWNIE_TRAINING_TEST_CASES) {
      expect(detectTrainingIntent(tc.user_message)).toBe(tc.intent);
    }
  });

  it("returns few-shot examples with ideal responses", async () => {
    const pack = await loadFewShotExamplesForChat({
      lastUserMessage: "عايز هدية لبنت",
      locale: "ar",
    });
    expect(pack.detected_intent).toBe("gift_request");
    expect(pack.examples.length).toBeGreaterThan(0);
    const gift = pack.examples.find((e) => e.intent === "gift_request");
    expect(gift?.ideal_response.length).toBeGreaterThan(20);
    if (gift && MR_BROWNIE_TRAINING_TEST_CASES[0].must_include_any) {
      const lower = gift.ideal_response.toLowerCase();
      const hit = MR_BROWNIE_TRAINING_TEST_CASES[0].must_include_any.some((s) =>
        lower.includes(s.toLowerCase()),
      );
      expect(hit).toBe(true);
    }
  });
});
