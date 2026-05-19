import { renderTemplateString } from "@/lib/notifications/template-vars";

describe("renderTemplateString", () => {
  it("replaces placeholders", () => {
    expect(
      renderTemplateString("Hi {{name}}, order {{orderNumber}}", {
        name: "Sara",
        orderNumber: "99",
      }),
    ).toBe("Hi Sara, order 99");
  });

  it("removes missing keys", () => {
    expect(renderTemplateString("Hello {{missing}}", {})).toBe("Hello ");
  });
});
