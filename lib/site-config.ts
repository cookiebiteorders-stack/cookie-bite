function numFromEnv(value: string | undefined, fallback: number) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** إعدادات المتجر المعروضة للعميل (من NEXT_PUBLIC_*). */
export const siteConfig = {
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
  standardDeliveryFeeEgp: numFromEnv(process.env.NEXT_PUBLIC_DELIVERY_FEE_EGP, 50),
} as const;
