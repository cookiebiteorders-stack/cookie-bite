import { z } from "zod";

const egyptPhone = z
  .string()
  .trim()
  .regex(/^01[0125][0-9]{8}$/, "رقم مصر: 01xxxxxxxxx (11 رقم)");

function optionalEgyptPhone() {
  return z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine((v) => v === null || /^01[0125][0-9]{8}$/.test(v), {
      message: "رقم ثانوي غير صالح",
    });
}

export const completeProfileSchema = z.object({
  full_name_en: z.string().trim().min(2).max(120),
  full_name_ar: z.string().trim().min(2).max(120),
  phone: egyptPhone,
  phone_secondary: optionalEgyptPhone(),
  profile_notes: z.string().trim().max(2000).optional().nullable(),
  address: z.object({
    label: z.string().trim().max(80).optional().nullable(),
    recipient: z.string().trim().min(2).max(120),
    phone: egyptPhone,
    phone_secondary: optionalEgyptPhone(),
    street: z.string().trim().min(3).max(240),
    building: z.string().trim().max(80).optional().nullable(),
    floor: z.string().trim().max(40).optional().nullable(),
    apartment: z.string().trim().max(40).optional().nullable(),
    city: z.string().trim().min(2).max(80),
    governorate: z.string().trim().min(2).max(80),
    delivery_notes: z.string().trim().max(500).optional().nullable(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
