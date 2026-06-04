import type { Addon } from "@/lib/addons/types";

export type AddonTemplateId = "chocolate_cup" | "hot_drink" | "extra_toppings";

type AddonDraft = Omit<Addon, "id">;

function option(
  name: string,
  price: number,
  opts?: { size?: string; default_selected?: boolean; quantity_limit?: number | null },
) {
  return {
    id: crypto.randomUUID(),
    name,
    size: opts?.size ?? "",
    price,
    quantity_limit: opts?.quantity_limit ?? null,
    default_selected: Boolean(opts?.default_selected),
  };
}

const TEMPLATES: Record<AddonTemplateId, { labelAr: string; labelEn: string; draft: AddonDraft }> = {
  chocolate_cup: {
    labelAr: "كوب شوكولاتة",
    labelEn: "Chocolate cup",
    draft: {
      name: "كوب شوكولاتة",
      description: "إضافة شوكولاتة ساخنة مع الطلب",
      type: "single_choice",
      required: false,
      options: [
        option("بدون إضافة", 0, { default_selected: true }),
        option("كوب صغير", 45),
        option("كوب كبير", 75),
      ],
    },
  },
  hot_drink: {
    labelAr: "مشروب مع الطلب",
    labelEn: "Drink add-on",
    draft: {
      name: "مشروب مع الطلب",
      description: "اختر مشروباً إضافياً",
      type: "single_choice",
      required: false,
      options: [
        option("بدون مشروب", 0, { default_selected: true }),
        option("آيس لاتيه", 55),
        option("شاي", 35),
        option("قهوة", 40),
      ],
    },
  },
  extra_toppings: {
    labelAr: "إضافات فوق المنتج",
    labelEn: "Extra toppings",
    draft: {
      name: "إضافات فوق المنتج",
      description: "يمكن اختيار أكثر من إضافة",
      type: "multiple_choice",
      required: false,
      options: [
        option("صوص كراميل", 15),
        option("صوص نوتيلا", 20),
        option("مكسرات", 25, { quantity_limit: 1 }),
      ],
    },
  },
};

export function listAddonTemplates(): Array<{
  id: AddonTemplateId;
  labelAr: string;
  labelEn: string;
}> {
  return (Object.keys(TEMPLATES) as AddonTemplateId[]).map((id) => ({
    id,
    labelAr: TEMPLATES[id].labelAr,
    labelEn: TEMPLATES[id].labelEn,
  }));
}

/** Fills the admin form — new option ids each apply. */
export function buildAddonFromTemplate(templateId: AddonTemplateId): Addon {
  const { draft } = TEMPLATES[templateId];
  return {
    id: "",
    name: draft.name,
    description: draft.description ?? "",
    type: draft.type,
    required: draft.required,
    options: draft.options.map((o) => ({ ...o, id: crypto.randomUUID() })),
  };
}
