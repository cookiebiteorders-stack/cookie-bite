import { z } from "zod";
import { MAX_PRODUCT_IMAGES } from "@/lib/products/media";

export const productImageSchema = z.object({
  url: z.string().url(),
  alt_en: z.string().max(200).nullable().optional(),
  alt_ar: z.string().max(200).nullable().optional(),
  order: z.number().int().min(0).max(MAX_PRODUCT_IMAGES - 1).optional(),
});

export const productImagesSchema = z
  .array(productImageSchema)
  .max(MAX_PRODUCT_IMAGES)
  .optional();

export const productVideoUrlSchema = z
  .string()
  .url()
  .max(2048)
  .nullable()
  .optional();

export const productBadgesSchema = z.array(z.string().max(40)).max(12).optional();

export const productSeasonsSchema = z.array(z.string().max(40)).max(8).optional();
