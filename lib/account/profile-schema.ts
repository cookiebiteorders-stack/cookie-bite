import { z } from "zod";

const EGYPT_PHONE_RE = /^01[0125][0-9]{8}$/;

/** يطبّع أرقام مصر: مسافات، +20، 10 أرقام بدون 0 */
export function normalizeEgyptPhone(raw: string): string {
  let s = raw.replace(/\s+/g, "").replace(/^\+20/, "0").replace(/^20/, "0");
  if (/^1[0125][0-9]{8}$/.test(s)) s = `0${s}`;
  return s;
}

function trimToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function optionalEgyptPhone() {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      const raw = typeof v === "string" ? v : "";
      const n = normalizeEgyptPhone(raw);
      return n.length > 0 ? n : null;
    })
    .refine((v) => v === null || EGYPT_PHONE_RE.test(v), {
      message: "رقم مصر: 01xxxxxxxxx (11 رقم)",
    });
}

function optionalName(max = 120) {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform(trimToNull)
    .refine((v) => v === null || (v.length >= 2 && v.length <= max), {
      message: "الاسم يجب أن يكون حرفين على الأقل إن أُدخل",
    });
}

const optionalAddressSchema = z
  .object({
    label: z.union([z.string(), z.null(), z.undefined()]).transform(trimToNull),
    recipient: optionalName(120),
    phone: optionalEgyptPhone(),
    phone_secondary: optionalEgyptPhone(),
    street: z
      .union([z.string(), z.null(), z.undefined()])
      .transform(trimToNull)
      .refine((v) => v === null || (v.length >= 3 && v.length <= 240), {
        message: "الشارع قصير جداً",
      }),
    building: z.union([z.string(), z.null(), z.undefined()]).transform(trimToNull),
    floor: z.union([z.string(), z.null(), z.undefined()]).transform(trimToNull),
    apartment: z.union([z.string(), z.null(), z.undefined()]).transform(trimToNull),
    city: z
      .union([z.string(), z.null(), z.undefined()])
      .transform(trimToNull)
      .refine((v) => v === null || (v.length >= 2 && v.length <= 80), {
        message: "اسم المدينة قصير",
      }),
    governorate: z
      .union([z.string(), z.null(), z.undefined()])
      .transform(trimToNull)
      .refine((v) => v === null || (v.length >= 2 && v.length <= 80), {
        message: "اسم المحافظة قصير",
      }),
    delivery_notes: z.union([z.string(), z.null(), z.undefined()]).transform(trimToNull),
    latitude: z.union([z.number(), z.null(), z.undefined()]).optional(),
    longitude: z.union([z.number(), z.null(), z.undefined()]).optional(),
  })
  .optional()
  .nullable();

export const completeProfileSchema = z.object({
  /** تخطي الإكمال — يُحدَّد الملف كمكتمل دون إلزام حقول */
  skip_profile: z.boolean().optional(),
  full_name_en: optionalName(120),
  full_name_ar: optionalName(120),
  phone: optionalEgyptPhone(),
  phone_secondary: optionalEgyptPhone(),
  profile_notes: z.union([z.string(), z.null(), z.undefined()]).transform(trimToNull),
  address: optionalAddressSchema,
});

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;

export type ParsedAddress = NonNullable<CompleteProfileInput["address"]>;

/** عنوان كامل بما يكفي للحفظ في قاعدة البيانات (حقول not null) */
export function hasMeaningfulAddress(
  addr: CompleteProfileInput["address"],
): addr is ParsedAddress {
  if (!addr) return false;
  return Boolean(
    addr.street?.trim() &&
      addr.recipient?.trim() &&
      addr.phone?.trim() &&
      addr.city?.trim(),
  );
}

export function hasAnyProfileFields(body: CompleteProfileInput): boolean {
  return Boolean(
    body.full_name_en ||
      body.full_name_ar ||
      body.phone ||
      body.phone_secondary ||
      body.profile_notes,
  );
}

/** أول رسالة Zod للعرض في الواجهة */
export function firstProfileSchemaError(
  error: z.ZodError,
): { en: string; ar: string } {
  const issue = error.issues[0];
  const msg = issue?.message ?? "Invalid profile data";
  const isAr = /[\u0600-\u06FF]/.test(msg);
  return isAr ? { en: "Invalid profile data", ar: msg } : { en: msg, ar: "بيانات الملف غير صالحة" };
}
