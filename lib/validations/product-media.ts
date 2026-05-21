import { z } from "zod";
import { MAX_PRODUCT_IMAGES } from "@/lib/products/media";

/** Accepts https URLs and site-relative paths (/images/...). */
export const productMediaUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (u) => {
      if (u.startsWith("/")) return true;
      try {
        const parsed = new URL(u);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Invalid media URL" },
  );

export const productImageSchema = z.object({
  url: productMediaUrlSchema,
  alt_en: z.string().max(200).nullable().optional(),
  alt_ar: z.string().max(200).nullable().optional(),
  order: z.number().int().min(0).max(MAX_PRODUCT_IMAGES - 1).optional(),
});

export const productImagesSchema = z
  .array(productImageSchema)
  .max(MAX_PRODUCT_IMAGES)
  .optional();

export const productVideoUrlSchema = productMediaUrlSchema.max(2048).nullable().optional();

export const productBadgesSchema = z.array(z.string().max(40)).max(12).optional();

export const productSeasonsSchema = z.array(z.string().max(40)).max(8).optional();
