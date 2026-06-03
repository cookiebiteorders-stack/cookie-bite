import { applyOccasionTemplateToState } from "@/lib/occasion-templates/apply";
import type { BuilderProduct } from "@/lib/gift-box-builder/data";
import { DEFAULT_GIFT_BOX_SIZES } from "@/lib/gift-box-builder/sizes";
import type { OccasionTemplate } from "@/lib/occasion-templates/types";

const products: BuilderProduct[] = [
  {
    id: "p1",
    productUuid: "p1",
    slug: "a",
    name: "Cookie A",
    price: 80,
    emoji: "🍪",
    category: "Cookies",
    tags: [],
    imageUrl: "/a.png",
    availableQuantity: 10,
  },
  {
    id: "p2",
    productUuid: "p2",
    slug: "b",
    name: "Brownie B",
    price: 90,
    emoji: "🟫",
    category: "Brownies",
    tags: [],
    imageUrl: "/b.png",
    availableQuantity: 10,
  },
  {
    id: "p3",
    productUuid: "p3",
    slug: "c",
    name: "Cookie C",
    price: 70,
    emoji: "🍪",
    category: "Cookies",
    tags: [],
    imageUrl: "/c.png",
    availableQuantity: 10,
  },
  {
    id: "p4",
    productUuid: "p4",
    slug: "d",
    name: "Cookie D",
    price: 85,
    emoji: "🍪",
    category: "Cookies",
    tags: [],
    imageUrl: "/d.png",
    availableQuantity: 10,
  },
];

const template: OccasionTemplate = {
  id: "t1",
  name_ar: "عيد ميلاد",
  name_en: "Birthday",
  occasion_type: "birthday",
  emoji: "🎂",
  description_ar: null,
  description_en: null,
  suggested_products: [],
  suggested_addons: [],
  suggested_message_ar: "كل عام وأنت بخير",
  suggested_message_en: "Happy birthday",
  suggested_box_code: "medium",
  ribbon_color: "gold",
  wrap_style: "kraft",
  card_design: "birthday",
  cover_image: null,
  sort_order: 1,
  is_featured: true,
};

describe("applyOccasionTemplateToState", () => {
  it("sets box, message, items, and step 2", () => {
    const partial = applyOccasionTemplateToState(
      template,
      products,
      DEFAULT_GIFT_BOX_SIZES,
      "en",
    );
    expect(partial.box).toBe("medium");
    expect(partial.msgText).toBe("Happy birthday");
    expect(partial.currentStep).toBe(2);
    expect(Object.keys(partial.items ?? {}).length).toBeGreaterThanOrEqual(3);
  });

  it("uses explicit suggested products when provided", () => {
    const withProducts: OccasionTemplate = {
      ...template,
      suggested_products: [
        { product_id: "p1", quantity: 2 },
        { product_id: "p2", quantity: 1 },
      ],
    };
    const partial = applyOccasionTemplateToState(
      withProducts,
      products,
      DEFAULT_GIFT_BOX_SIZES,
      "en",
    );
    expect(partial.items?.p1).toBe(2);
    expect(partial.items?.p2).toBe(1);
  });
});
