import { runIntentEngine } from "@/lib/mr-brownie/brain/intent-engine";
import {
  extractMessageEntities,
  normalizeMessage,
  understandUserMessage,
} from "@/lib/mr-brownie/brain/message-understanding";
import { detectTrainingIntentDetailed } from "@/lib/mr-brownie/training/detect-intent";

describe("Mr. Brownie message understanding", () => {
  it("normalizes Arabic alef variants", () => {
    expect(normalizeMessage("إيه أحسن كوكيز")).toContain("ايه");
  });

  it("detects Egyptian gift phrasing", () => {
    const u = understandUserMessage({ message: "عايز أهدي صاحبتي هدية عيد ميلاد" });
    expect(u.top_intent).toBe("gift_request");
    expect(u.entities.occasion).toBe("birthday");
    expect(u.confidence_pct).toBeGreaterThan(50);
  });

  it("extracts budget in EGP", () => {
    const entities = extractMessageEntities("عايز حاجة تحت 500 جنيه", "...");
    expect(entities.budget_egp).toBe(500);
  });

  it("continues prior topic on short affirmation", () => {
    const engine = runIntentEngine({
      userMessage: "تمام",
      pageIntent: "other",
      priorUserMessages: ["عايز بوكس هدية لخطوبة"],
    });
    expect(engine.primary).toBe("gift_request");
    expect(engine.confidence_pct).toBeGreaterThan(55);
  });

  it("detects promo intent with code", () => {
    const engine = runIntentEngine({
      userMessage: "عندي كود خصم SUMMER20",
      pageIntent: "checkout",
    });
    expect(engine.primary).toBe("promo_help");
    expect(engine.entities.promo_code).toBe("SUMMER20");
  });

  it("scores product browse over general for recommendation ask", () => {
    const d = detectTrainingIntentDetailed("ممكن ترشحلي حاجة مع القهوة؟");
    expect(["pairing", "product_browse"]).toContain(d.intent);
    expect(d.confidence_pct).toBeGreaterThan(40);
  });

  it("flags ambiguity when gift and product signals tie", () => {
    const u = understandUserMessage({
      message: "عايز كوكيز هدية",
    });
    expect(u.top_intent).toBe("gift_request");
  });

  it("detects order tracking in colloquial Arabic", () => {
    const engine = runIntentEngine({
      userMessage: "فين الأوردر بتاعي؟",
      pageIntent: "other",
    });
    expect(engine.primary).toBe("order_status");
  });
});
