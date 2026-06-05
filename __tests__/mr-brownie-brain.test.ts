import { runIntentEngine } from "@/lib/mr-brownie/brain/intent-engine";
import { buildLayeredThinkingPlan } from "@/lib/mr-brownie/brain/layered-thinking";
import { runResponseCritic } from "@/lib/mr-brownie/brain/response-critic";
import { routeTools } from "@/lib/mr-brownie/brain/tool-router";
import { resolvePersonalityMode } from "@/lib/mr-brownie/brain/personality-router";
import { scoreAssistantResponse } from "@/lib/mr-brownie/brain/response-quality";
import { searchCatalogForQuery } from "@/lib/mr-brownie/brain/product-search-tool";

describe("Mr. Brownie brain", () => {
  it("routes sales personality for gift intent on gift page", () => {
    expect(
      resolvePersonalityMode({
        intent: "gift_request",
        pageIntent: "gift_box",
      }),
    ).toBe("sales");
  });

  it("detects fast_gift and navigation intents", () => {
    expect(
      runIntentEngine({ userMessage: "عايز بوكس سريع", pageIntent: "other" }).primary,
    ).toBe("fast_gift");
    expect(
      runIntentEngine({ userMessage: "فين صفحة الهدايا", pageIntent: "other" }).primary,
    ).toBe("navigation");
  });

  it("exposes confidence_pct tiers", () => {
    const low = runIntentEngine({ userMessage: "...", pageIntent: "other" });
    expect(low.confidence_pct).toBeLessThanOrEqual(60);
    const gift = runIntentEngine({
      userMessage: "عايز بوكس هدية لصديقتي",
      pageIntent: "gift_box",
    });
    expect(gift.confidence_pct).toBeGreaterThanOrEqual(60);
  });

  it("routes gift intent to gift_box_builder tool", () => {
    const intent = runIntentEngine({
      userMessage: "اعمل لي بوكس هدية",
      pageIntent: "other",
    });
    const routes = routeTools(intent);
    expect(routes.some((r) => r.tool === "gift_box_builder")).toBe(true);
  });

  it("layered thinking clarifies on low confidence", () => {
    const intent = runIntentEngine({ userMessage: "مش فاهم", pageIntent: "other" });
    const plan = buildLayeredThinkingPlan({
      userMessage: "مش فاهم",
      intent,
      confidencePct: intent.confidence_pct,
    });
    expect(plan.layer2_decision.action).toBe("clarify");
  });

  it("critic scores weighted dimensions", () => {
    const v = runResponseCritic(
      "تمام 👌\n* Chocolate Chip — 80 EGP → /shop/choc\nتحب أضيفه للسلة؟",
      { catalogTotal: 5 },
    );
    expect(v.dimensions.clarity).toBeGreaterThan(50);
    expect(v.score).toBeGreaterThanOrEqual(65);
  });

  it("routes support for complaints", () => {
    expect(
      resolvePersonalityMode({
        intent: "complaint",
        pageIntent: "other",
      }),
    ).toBe("support");
  });

  it("scores weak replies without follow-up", () => {
    const q = scoreAssistantResponse("ok", { catalogTotal: 10 });
    expect(q.pass).toBe(false);
    expect(q.issues).toContain("missing_follow_up");
  });

  it("searches catalog by keyword", () => {
    const hits = searchCatalogForQuery("chocolate", [
      {
        id: "choc-chip",
        product_uuid: "1",
        name: "Chocolate Chip",
        name_ar: null,
        description: "classic",
        price_egp: 80,
        compare_price_egp: null,
        category: "Classic",
        badges: [],
        stock: 5,
        in_stock: true,
        dietary: [],
        pieces_count: 1,
        shop_path: "/shop/choc-chip",
        image_url: null,
      },
    ]);
    expect(hits[0]?.id).toBe("choc-chip");
  });
});
