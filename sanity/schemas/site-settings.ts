import { defineField, defineType } from "sanity";

export const siteSettingsSchema = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({ name: "announcement_bar_en", type: "string" }),
    defineField({ name: "announcement_bar_ar", type: "string" }),
    defineField({ name: "working_hours", type: "string" }),
    defineField({ name: "free_delivery_threshold", type: "number" }),
    defineField({ name: "contact_phone", type: "string" }),
    defineField({ name: "contact_address_en", type: "string" }),
    defineField({ name: "contact_address_ar", type: "string" }),
  ],
});
