import { buildAddonSubmitPayload, normalizeAddonInput, validateAddonForm } from "@/lib/addons/submit-payload";
import type { Addon } from "@/lib/addons/types";

const baseForm: Addon = {
  id: "",
  name: "Gift wrap",
  description: "",
  type: "single_choice",
  required: false,
  options: [
    {
      id: "",
      name: "Standard",
      size: "Medium",
      price: 25,
      quantity_limit: null,
      default_selected: true,
    },
  ],
};

describe("addon submit payload", () => {
  it("omits id on create", () => {
    const payload = buildAddonSubmitPayload(baseForm, null);
    expect("id" in payload).toBe(false);
    expect(payload.name).toBe("Gift wrap");
    expect(payload.options[0]?.size).toBe("Medium");
  });

  it("includes id on update", () => {
    const payload = buildAddonSubmitPayload(baseForm, "550e8400-e29b-41d4-a716-446655440000");
    expect(payload.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("strips empty id from normalize", () => {
    const normalized = normalizeAddonInput({ ...baseForm, id: "" });
    expect(normalized).toMatchObject({ name: "Gift wrap" });
    expect((normalized as { id?: string }).id).toBeUndefined();
  });

  it("validates required fields", () => {
    expect(validateAddonForm({ ...baseForm, name: "  " })).toContain("name");
    expect(validateAddonForm({ ...baseForm, options: [{ ...baseForm.options[0]!, name: "" }] })).toContain("Option");
  });
});
