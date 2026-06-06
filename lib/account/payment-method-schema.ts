import { z } from "zod";
import { isValidEgyptPhone, normalizeEgyptPhone } from "@/lib/account/profile-schema";

export const PAYMENT_METHOD_TYPES = [
  "card",
  "wallet",
  "instapay",
  "fawry",
  "cod",
] as const;

export const WALLET_PROVIDERS = [
  "vodafone",
  "orange",
  "etisalat",
  "we",
  "other",
] as const;

export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];
export type WalletProvider = (typeof WALLET_PROVIDERS)[number];

const baseSchema = z.object({
  label: z.string().trim().min(1).max(60).default("Default"),
  method_type: z.enum(PAYMENT_METHOD_TYPES),
  wallet_provider: z.enum(WALLET_PROVIDERS).nullish(),
  account_hint: z.string().trim().max(120).nullish().transform((v) => v || null),
  card_last4: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v && /^\d{4}$/.test(v) ? v : null)),
  cardholder_name: z.string().trim().max(80).nullish().transform((v) => v || null),
  is_default: z.boolean().optional(),
});

export const paymentMethodUpsertSchema = baseSchema.superRefine((data, ctx) => {
  if (data.method_type === "wallet") {
    if (!data.wallet_provider) {
      ctx.addIssue({
        code: "custom",
        message: "اختر مشغّل المحفظة",
        path: ["wallet_provider"],
      });
    }
    const phone = normalizeEgyptPhone(data.account_hint ?? "");
    if (!isValidEgyptPhone(phone)) {
      ctx.addIssue({
        code: "custom",
        message: "رقم محفظة مصر صالح مطلوب (01…)",
        path: ["account_hint"],
      });
    }
  }
  if (data.method_type === "instapay") {
    if (!data.account_hint || data.account_hint.length < 3) {
      ctx.addIssue({
        code: "custom",
        message: "أدخل معرّف InstaPay أو رقم الحساب",
        path: ["account_hint"],
      });
    }
  }
  if (data.method_type === "fawry") {
    if (!data.account_hint || data.account_hint.length < 2) {
      ctx.addIssue({
        code: "custom",
        message: "أدخل رقم فوري أو مرجع الدفع",
        path: ["account_hint"],
      });
    }
  }
});

export type PaymentMethodUpsertInput = z.infer<typeof paymentMethodUpsertSchema>;

export function firstPaymentMethodSchemaError(error: z.ZodError): { en: string; ar: string } {
  const issue = error.issues[0];
  const msg = issue?.message ?? "Invalid payment method";
  const isAr = /[\u0600-\u06FF]/.test(msg);
  return isAr
    ? { en: "Invalid payment method", ar: msg }
    : { en: msg, ar: "طريقة الدفع غير صالحة" };
}

export function normalizePaymentMethodPayload(input: PaymentMethodUpsertInput) {
  const account_hint =
    input.method_type === "wallet"
      ? normalizeEgyptPhone(input.account_hint ?? "")
      : input.account_hint;

  return {
    label: input.label.trim() || "Default",
    method_type: input.method_type,
    wallet_provider: input.method_type === "wallet" ? input.wallet_provider ?? null : null,
    account_hint: account_hint || null,
    card_last4: input.method_type === "card" ? input.card_last4 : null,
    cardholder_name: input.method_type === "card" ? input.cardholder_name : null,
    is_default: input.is_default,
  };
}
