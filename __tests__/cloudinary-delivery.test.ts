import { optimizeCloudinaryDeliveryUrl } from "@/lib/products/cloudinary-delivery";

describe("optimizeCloudinaryDeliveryUrl", () => {
  it("leaves non-cloudinary URLs unchanged", () => {
    expect(optimizeCloudinaryDeliveryUrl("/images/foo.png")).toBe("/images/foo.png");
  });

  it("injects transforms after upload", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
    const out = optimizeCloudinaryDeliveryUrl(url, 800);
    expect(out).toContain("/upload/f_auto,q_auto,w_800/");
    expect(out).toContain("sample.jpg");
  });

  it("skips when f_auto already present", () => {
    const url =
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/sample.jpg";
    expect(optimizeCloudinaryDeliveryUrl(url, 1200)).toBe(url);
  });
});
