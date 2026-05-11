import type { ShippingZoneRow } from "@/lib/shipping/types";

export function normalizeZone(raw: unknown): ShippingZoneRow {
  const z = raw as Record<string, unknown>;
  const citiesRaw = z.cities;
  const cities = Array.isArray(citiesRaw)
    ? citiesRaw.map((c) => String(c).trim()).filter(Boolean)
    : [];
  return {
    id: String(z.id ?? ""),
    name: String(z.name ?? ""),
    cities,
    base_fee_egp: Number(z.base_fee_egp ?? 0),
    free_shipping_threshold_egp:
      z.free_shipping_threshold_egp == null || z.free_shipping_threshold_egp === ""
        ? null
        : Number(z.free_shipping_threshold_egp),
    eta_min_days: Math.max(0, Math.floor(Number(z.eta_min_days ?? 1))),
    eta_max_days: Math.max(0, Math.floor(Number(z.eta_max_days ?? 3))),
    is_active: Boolean(z.is_active),
    sort_order: z.sort_order == null ? undefined : Number(z.sort_order),
    created_at: z.created_at == null ? undefined : String(z.created_at),
    updated_at: z.updated_at == null ? undefined : String(z.updated_at),
  };
}
