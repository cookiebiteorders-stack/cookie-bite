/** سعر تحويل تقريبي للواجهة فقط — الرسوم تُخزَّن دائماً بالجنيه في API */
export const EGP_PER_USD =
  (typeof process !== "undefined"
    ? Number(process.env.NEXT_PUBLIC_EGP_PER_USD ?? "49")
    : 49) || 49;

export function displayFeeToEgp(amount: number, currency: "EGP" | "USD"): number {
  if (currency === "EGP") return Math.round(amount * 100) / 100;
  return Math.round(amount * EGP_PER_USD * 100) / 100;
}

export function egpToDisplayUsd(egp: number): number {
  return Math.round((egp / EGP_PER_USD) * 100) / 100;
}
