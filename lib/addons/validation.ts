import { z } from "zod";
import { dedupeIds } from "@/lib/addons/dedupe";

export const addonOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(160),
  size: z.string().max(80).nullable().optional(),
  price: z.number().nonnegative(),
  quantity_limit: z.number().int().positive().nullable().optional(),
  default_selected: z.boolean().default(false),
});

export const addonSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  type: z.enum(["single_choice", "multiple_choice"]),
  required: z.boolean().default(false),
  options: z.array(addonOptionSchema).min(1),
});

export const linkedAddonIdsSchema = z
  .array(z.string().uuid())
  .default([])
  .transform((ids) => dedupeIds(ids));
