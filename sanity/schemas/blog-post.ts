import { defineField, defineType } from "sanity";

export const blogPostSchema = defineType({
  name: "blogPost",
  title: "Blog Post",
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
    defineField({ name: "excerpt_en", type: "text" }),
    defineField({ name: "excerpt_ar", type: "text" }),
    defineField({ name: "body_en", type: "array", of: [{ type: "block" }] }),
    defineField({ name: "body_ar", type: "array", of: [{ type: "block" }] }),
    defineField({ name: "cover_image", type: "image" }),
    defineField({ name: "is_published", type: "boolean", initialValue: true }),
    defineField({
      name: "date_published",
      type: "datetime",
      title: "Published at",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({ name: "author_name", type: "string", title: "Author name", initialValue: "Cookie Bite" }),
    defineField({ name: "seo_title", type: "string", title: "SEO title override" }),
    defineField({ name: "seo_description", type: "text", title: "SEO meta description" }),
    defineField({ name: "focus_keyword", type: "string", title: "Focus keyword" }),
    defineField({
      name: "related_product_slugs",
      type: "array",
      title: "Related product slugs",
      of: [{ type: "string" }],
    }),
  ],
});
