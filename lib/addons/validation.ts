import { z } from "zod";
import { dedupeIds } from "@/lib/addons/dedupe";

export const addonOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(160),
  size: z.string().max(80).nullable().optional(),
  weight_grams: z.number().int().nonnegative().nullable().optional(),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative().nullable().optional(),
  quantity_limit: z.number().int().positive().nullable().optional(),
  default_selected: z.boolean().default(false),
});

export const addonSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  type: z.enum(["single_choice", "multiple_choice"]),
  required: z.boolean().default(false),
  category_id: z.string().uuid().nullable().optional(),
  options: z.array(addonOptionSchema).min(0),
});

export const addonCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  selection_type: z.enum(["single_choice", "multiple_choice"]),
  required: z.boolean().default(false),
  sort_order: z.number().int().nonnegative().optional(),
});

export const addonCategoryItemSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(160),
  weight_grams: z.number().int().nonnegative().nullable().optional(),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative().nullable().optional(),
  quantity_limit: z.number().int().positive().nullable().optional(),
  default_selected: z.boolean().default(false),
});

export const mergeAddonCategoriesSchema = z.object({
  target_id: z.string().uuid(),
  source_ids: z.array(z.string().uuid()).min(1),
});

export const linkedAddonIdsSchema = z
  .array(z.string().uuid())
  .default([])
  .transform((ids) => dedupeIds(ids));
