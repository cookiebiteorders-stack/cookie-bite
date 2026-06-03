import { generateMysteryBoxSelection } from "@/lib/mystery-box/generate";
import type { MysteryBoxRule, MysteryCandidateProduct } from "@/lib/mystery-box/types";

const rule: MysteryBoxRule = {
  id: "test-rule",
  occasion: "thanks",
  budget_min: 250,
  budget_max: 500,
  product_categories: [],
  min_items: 3,
  max_items: 5,
  description_ar: "هدية شكر",
  description_en: "Thank-you box",
};

const products: MysteryCandidateProduct[] = [
  {
    id: "a",
    slug: "cookie-a",
    name: "Choco Chip",
    nameAr: "شوكولاتة",
    price: 80,
    category: "Cookies",
    imageUrl: "/x.png",
    stock: 10,
    dietary: [],
  },
  {
    id: "b",
    slug: "cookie-b",
    name: "Brownie Bite",
    nameAr: "براوني",
    price: 90,
    category: "Brownies",
    imageUrl: "/y.png",
    stock: 10,
    dietary: [],
  },
  {
    id: "c",
    slug: "cookie-c",
    name: "Vanilla Dream",
    nameAr: "فانيليا",
    price: 70,
    category: "Cookies",
    imageUrl: "/z.png",
    stock: 10,
    dietary: [],
  },
  {
    id: "d",
    slug: "cookie-d",
    name: "Caramel",
    nameAr: "كراميل",
    price: 85,
    category: "Cookies",
    imageUrl: "/w.png",
    stock: 10,
    dietary: [],
  },
];

describe("generateMysteryBoxSelection", () => {
  it("returns items within budget and min count", () => {
    const result = generateMysteryBoxSelection({
      rule,
      occasion: "thanks",
      budget: 400,
      products,
      lang: "en",
    });
    expect(result).not.toBeNull();
    expect(result!.totalItems).toBeGreaterThanOrEqual(3);
    expect(result!.totalPrice).toBeLessThanOrEqual(400);
    expect(result!.items.length).toBeGreaterThan(0);
  });

  it("excludes nuts when preferences mention nuts", () => {
    const withNuts: MysteryCandidateProduct[] = [
      ...products,
      {
        id: "nuts",
        slug: "nut-cookie",
        name: "Almond Crunch",
        nameAr: "لوز",
        price: 75,
        category: "Cookies",
        imageUrl: "/n.png",
        stock: 10,
        dietary: [],
      },
    ];
    const result = generateMysteryBoxSelection({
      rule,
      occasion: "thanks",
      budget: 400,
      preferences: "no nuts please",
      products: withNuts,
      lang: "en",
    });
    expect(result).not.toBeNull();
    expect(result!.items.every((i) => i.productId !== "nuts")).toBe(true);
  });
});
