import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { productSchema } from "@/sanity/schemas/product";
import { categorySchema } from "@/sanity/schemas/category";
import { siteSettingsSchema } from "@/sanity/schemas/site-settings";
import { blogPostSchema } from "@/sanity/schemas/blog-post";

export default defineConfig({
  name: "cookie-bite",
  title: "Cookie Bite CMS",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  plugins: [structureTool(), visionTool()],
  schema: {
    types: [productSchema, categorySchema, siteSettingsSchema, blogPostSchema],
  },
});
