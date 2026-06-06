import { z } from "zod";
import { isValidEgyptPhone, normalizeEgyptPhone } from "@/lib/account/profile-schema";

function requiredEgyptPhone(fieldEn: string, fieldAr: string) {
  return z
    .string()
    .trim()
    .min(1, { message: `${fieldAr} مطلوب` })
    .transform(normalizeEgyptPhone)
    .refine(isValidEgyptPhone, {
      message: `${fieldAr}: 11 رقم يبدأ بـ 01`,
    });
}

function optionalEgyptPhone() {
  return z
    .string()
    .nullish()
    .transform((v) => {
      const n = normalizeEgyptPhone(v ?? "");
      if (!n.length) return null;
      return isValidEgyptPhone(n) ? n : null;
    });
}

export const EGYPT_GOVERNORATES = [
  "Cairo",
  "Giza",
  "Qalyubia",
  "Alexandria",
  "Sharqia",
  "Dakahlia",
  "Other",
] as const;

export const addressUpsertSchema = z.object({
  label: z.string().trim().min(1).max(40).default("Home"),
  recipient: z.string().trim().min(2).max(120),
  phone: requiredEgyptPhone("Phone", "رقم الهاتف"),
  phone_secondary: optionalEgyptPhone(),
  street: z.string().trim().min(3).max(240),
  building: z.string().trim().max(80).nullish().transform((v) => v || null),
  floor: z.string().trim().max(20).nullish().transform((v) => v || null),
  apartment: z.string().trim().max(20).nullish().transform((v) => v || null),
  city: z.string().trim().min(2).max(80),
  governorate: z.string().trim().min(2).max(80).default("Cairo"),
  delivery_notes: z.string().trim().max(400).nullish().transform((v) => v || null),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  is_default: z.boolean().optional(),
});

export type AddressUpsertInput = z.infer<typeof addressUpsertSchema>;

export function firstAddressSchemaError(error: z.ZodError): { en: string; ar: string } {
  const issue = error.issues[0];
  const msg = issue?.message ?? "Invalid address";
  const isAr = /[\u0600-\u06FF]/.test(msg);
  return isAr
    ? { en: "Invalid address data", ar: msg }
    : { en: msg, ar: "بيانات العنوان غير صالحة" };
}
