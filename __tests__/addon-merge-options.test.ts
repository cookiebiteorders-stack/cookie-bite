import { mergeAddonOptionsWithIdRemap } from "@/lib/addons/dedupe";
import type { AddonOption } from "@/lib/addons/types";

const opt = (id: string, name: string): AddonOption => ({
  id,
  name,
  price: 10,
  default_selected: false,
});

describe("mergeAddonOptionsWithIdRemap", () => {
  it("keeps distinct option ids from both sides", () => {
    const { options, optionIdMap } = mergeAddonOptionsWithIdRemap(
      [opt("a1", "A")],
      [opt("b1", "B")],
    );
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.id)).toEqual(["a1", "b1"]);
    expect(optionIdMap.size).toBe(0);
  });

  it("reassigns conflicting option ids and records mapping", () => {
    const { options, optionIdMap } = mergeAddonOptionsWithIdRemap(
      [opt("same", "First")],
      [opt("same", "Second")],
    );
    expect(options).toHaveLength(2);
    expect(options[0]?.id).toBe("same");
    expect(options[1]?.id).not.toBe("same");
    expect(optionIdMap.get("same")).toBe(options[1]?.id);
  });

  it("assigns ids to incoming options missing id", () => {
    const { options } = mergeAddonOptionsWithIdRemap([opt("a1", "A")], [
      { id: "", name: "No id", price: 5, default_selected: false },
    ]);
    expect(options).toHaveLength(2);
    expect(options[1]?.id).toBeTruthy();
  });
});
