/** @jest-environment jsdom */
import {
  getNextStylesheetLinks,
  isStylesheetBundleLoaded,
  isTailwindCssLoaded,
  needsCssRecovery,
} from "@/lib/pwa/css-recovery";

describe("css-recovery", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    document.head.insertAdjacentHTML(
      "beforeend",
      '<style id="cb-critical-shell">.cb-storefront{min-height:100vh}</style>',
    );
  });

  it("does not treat critical shell alone as loaded bundle", () => {
    document.body.innerHTML = '<div class="cb-storefront">x</div>';
    expect(getNextStylesheetLinks()).toHaveLength(0);
    expect(isStylesheetBundleLoaded()).toBe(false);
    expect(needsCssRecovery()).toBe(true);
  });

  it("detects Tailwind when storefront is flex", () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<link rel="stylesheet" href="/_next/static/chunks/app.css" />',
    );
    const link = document.querySelector("link")!;
    Object.defineProperty(link, "sheet", {
      value: { cssRules: [{ cssText: ".flex{display:flex}" }] },
    });

    document.body.innerHTML =
      '<div class="cb-storefront" style="display:flex">x</div>';
    expect(isTailwindCssLoaded()).toBe(true);
    expect(isStylesheetBundleLoaded()).toBe(true);
    expect(needsCssRecovery()).toBe(false);
  });

  it("flags missing flex layout as broken CSS", () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<link rel="stylesheet" href="/_next/static/chunks/app.css" />',
    );
    document.body.innerHTML = '<div class="cb-storefront">x</div>';
    expect(isTailwindCssLoaded()).toBe(false);
    expect(needsCssRecovery()).toBe(true);
  });
});
