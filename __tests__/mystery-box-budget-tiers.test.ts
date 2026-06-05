import {
  FALLBACK_MYSTERY_RULES,
  getBudgetTiersForOccasion,
  getOccasionsFromRules,
} from "@/lib/mystery-box/budget-tiers";

describe("mystery box budget tiers", () => {
  it("derives occasions from rules", () => {
    const occasions = getOccasionsFromRules(FALLBACK_MYSTERY_RULES);
    expect(occasions).toContain("birthday");
    expect(occasions).toContain("thanks");
    expect(occasions).not.toContain("unknown" as never);
  });

  it("returns budget tiers that fit rule ranges", () => {
    const tiers = getBudgetTiersForOccasion(FALLBACK_MYSTERY_RULES, "thanks");
    expect(tiers).toHaveLength(1);
    expect(tiers[0].amount).toBeGreaterThanOrEqual(250);
    expect(tiers[0].amount).toBeLessThanOrEqual(500);
  });

  it("returns multiple birthday tiers", () => {
    const tiers = getBudgetTiersForOccasion(FALLBACK_MYSTERY_RULES, "birthday");
    expect(tiers.length).toBeGreaterThanOrEqual(2);
  });
});
