import { defineField, defineType } from "sanity";

export const categorySchema = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({ name: "title_en", type: "string", validation: (r) => r.required() }),
    defineField({ name: "title_ar", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title_en", maxLength: 96 },
      validation: (r) => r.required(),
    }),
  ],
});
