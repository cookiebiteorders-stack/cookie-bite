import { z } from "zod";

export const EGYPT_PHONE_RE = /^01[0125][0-9]{8}$/;

export function isValidEgyptPhone(raw: string): boolean {
  const n = normalizeEgyptPhone(raw);
  return n.length > 0 && EGYPT_PHONE_RE.test(n);
}

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

/** Zod 4: nullish input — غياب الحقل لا يفشّل التحقق (مهم لتخطي الملف) */
function optionalEgyptPhone() {
  return z.nullish(z.string()).transform((v) => {
    const n = normalizeEgyptPhone(v ?? "");
    if (!n.length) return null;
    return EGYPT_PHONE_RE.test(n) ? n : null;
  });
}

function optionalName(max = 120) {
  return z.nullish(z.string()).transform((v) => {
    const t = trimToNull(v);
    if (t && t.length === 1) return null;
    if (t && (t.length < 2 || t.length > max)) return null;
    return t;
  });
}

function optionalStreet() {
  return z.nullish(z.string()).transform((v) => {
    const t = trimToNull(v);
    if (t && t.length < 3) return null;
    return t;
  });
}

function optionalCityOrGov() {
  return z.nullish(z.string()).transform((v) => {
    const t = trimToNull(v);
    if (t && t.length < 2) return null;
    return t;
  });
}

const profileFieldsSchema = z.object({
  full_name_en: optionalName(120),
  full_name_ar: optionalName(120),
  phone: optionalEgyptPhone(),
  phone_secondary: optionalEgyptPhone(),
  profile_notes: z.nullish(z.string()).transform(trimToNull),
  address: z
    .object({
      label: z.nullish(z.string()).transform(trimToNull),
      recipient: optionalName(120),
      phone: optionalEgyptPhone(),
      phone_secondary: optionalEgyptPhone(),
      street: optionalStreet(),
      building: z.nullish(z.string()).transform(trimToNull),
      floor: z.nullish(z.string()).transform(trimToNull),
      apartment: z.nullish(z.string()).transform(trimToNull),
      city: optionalCityOrGov(),
      governorate: optionalCityOrGov(),
      delivery_notes: z.nullish(z.string()).transform(trimToNull),
      latitude: z.nullish(z.number()),
      longitude: z.nullish(z.number()),
    })
    .nullish(),
});

const skipProfileSchema = z.object({
  skip_profile: z.literal(true),
});

/** تخطي صريح أو إرسال حقول اختيارية — متوافق مع Zod 4 */
export const completeProfileSchema = z.discriminatedUnion("skip_profile", [
  skipProfileSchema,
  profileFieldsSchema.extend({
    skip_profile: z.literal(false).nullish(),
  }),
]);

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;

export type ParsedAddress = NonNullable<z.infer<typeof profileFieldsSchema>["address"]>;

/** عنوان كامل بما يكفي للحفظ في قاعدة البيانات (حقول not null) */
export function hasMeaningfulAddress(
  addr: ParsedAddress | null | undefined,
): addr is ParsedAddress {
  if (!addr) return false;
  return Boolean(
    addr.street?.trim() &&
      addr.recipient?.trim() &&
      addr.phone?.trim() &&
      addr.city?.trim(),
  );
}

export function isSkipProfileRequest(
  body: CompleteProfileInput,
): body is z.infer<typeof skipProfileSchema> {
  return "skip_profile" in body && body.skip_profile === true;
}

export function hasAnyProfileFields(body: CompleteProfileInput): boolean {
  if (isSkipProfileRequest(body)) return false;
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
