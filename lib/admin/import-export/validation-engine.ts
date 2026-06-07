import { z } from "zod";
import type { ColumnDef, ValidationIssue } from "@/lib/admin/import-export/types";
import type { ModuleKey } from "@/lib/admin/rbac";

const boolish = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    const s = v.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "نعم";
  });

const productRowSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(2).max(160).optional(),
    slug: z.string().max(120).optional(),
    title_en: z.string().max(200).optional(),
    title_ar: z.string().max(160).optional(),
    sku: z.string().max(80).nullable().optional(),
    category: z.string().max(100).nullable().optional(),
    price_egp: z.coerce.number().positive().optional(),
    stock: z.coerce.number().int().min(0).optional(),
    is_active: boolish.optional(),
  })
  .refine(
    (row) =>
      Boolean(row.id) ||
      (Boolean(row.name && row.name.length >= 2) &&
        row.price_egp != null &&
        Number(row.price_egp) > 0),
    { message: "Provide id to update, or name + price_egp to create" },
  );

const promoRowSchema = z.object({
  code: z.string().min(2).max(40),
  discount_type: z.enum(["percent", "fixed"]).optional(),
  discount_value: z.coerce.number().positive().optional(),
  is_active: boolish.optional(),
});

const expenseRowSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().max(80).optional(),
  amount_egp: z.coerce.number().positive(),
  expense_date: z.string().optional(),
});

const shippingRowSchema = z.object({
  name: z.string().min(1).max(120),
  base_fee_egp: z.coerce.number().min(0).optional(),
  is_active: boolish.optional(),
});

function schemaForModule(module: ModuleKey): z.ZodType<Record<string, unknown>> | null {
  switch (module) {
    case "products":
      return productRowSchema;
    case "discounts":
      return promoRowSchema;
    case "financial":
      return expenseRowSchema;
    case "shipping":
      return shippingRowSchema;
    default:
      return null;
  }
}

function coerceRow(raw: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === "" || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export function validateMappedRows(
  module: ModuleKey,
  mappedRows: Record<string, string>[],
  templateColumns: ColumnDef[],
): { validRows: Record<string, unknown>[]; issues: ValidationIssue[]; duplicates: number[] } {
  const schema = schemaForModule(module);
  const issues: ValidationIssue[] = [];
  const validRows: Record<string, unknown>[] = [];
  const seen = new Map<string, number>();
  const duplicates: number[] = [];

  const requiredKeys = templateColumns.filter((c) => c.required).map((c) => c.key);
  const dupKey = module === "products" ? "id" : module === "discounts" ? "code" : null;

  mappedRows.forEach((raw, index) => {
    const rowNum = index + 2;
    for (const key of requiredKeys) {
      if (!raw[key]?.trim()) {
        issues.push({ row: rowNum, field: key, message: `الحقل ${key} مطلوب` });
      }
    }
    const coerced = coerceRow(raw);
    if (!schema) {
      validRows.push(coerced);
      return;
    }
    const parsed = schema.safeParse(coerced);
    if (!parsed.success) {
      for (const err of parsed.error.issues) {
        issues.push({
          row: rowNum,
          field: err.path.join("."),
          message: err.message,
        });
      }
      return;
    }
    const row = parsed.data as Record<string, unknown>;
    if (dupKey) {
      const id = String(row[dupKey] ?? "");
      if (id) {
        const prev = seen.get(id);
        if (prev !== undefined) {
          duplicates.push(rowNum);
          if (!duplicates.includes(prev)) duplicates.push(prev);
        } else {
          seen.set(id, rowNum);
        }
      }
    }
    validRows.push(row);
  });

  return { validRows, issues, duplicates };
}

export function sanitizeCell(value: string): string {
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();
}
