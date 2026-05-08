import { defineField, defineType } from "sanity";

export const productSchema = defineType({
  name: "product",
  title: "Product",
  type: "document",
  fields: [
    defineField({
      name: "title_en",
      type: "string",
      title: "Title (EN)",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "title_ar",
      type: "string",
      title: "Title (AR)",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title_en", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: "description_en", type: "text", title: "Description (EN)" }),
    defineField({ name: "description_ar", type: "text", title: "Description (AR)" }),
    defineField({
      name: "price",
      type: "number",
      title: "Price",
      validation: (r) => r.required().positive(),
    }),
    defineField({ name: "compare_price", type: "number", title: "Compare Price" }),
    defineField({ name: "sku", type: "string", title: "SKU" }),
    defineField({ name: "stock_count", type: "number", initialValue: 0 }),
    defineField({
      name: "images",
      type: "array",
      of: [
        {
          type: "image",
          fields: [
            { name: "alt_en", type: "string", title: "Alt (EN)" },
            { name: "alt_ar", type: "string", title: "Alt (AR)" },
          ],
        },
      ],
    }),
    defineField({ name: "category", type: "reference", to: [{ type: "category" }] }),
    defineField({ name: "badges", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "dietary", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "seasons", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "is_active", type: "boolean", initialValue: true }),
    defineField({ name: "weight_grams", type: "number" }),
    defineField({ name: "pieces_count", type: "number" }),
  ],
  validation: (rule) =>
    rule.custom((doc) => {
      const record = doc as { title_en?: string; title_ar?: string };
      if (!record?.title_en || !record?.title_ar) {
        return "Both English and Arabic titles are required";
      }
      return true;
    }),
});
