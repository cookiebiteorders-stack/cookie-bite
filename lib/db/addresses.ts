import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AddressUpsertInput } from "@/lib/account/address-schema";

/** شكل العنوان في واجهة إكمال الملف / الحساب */
export type AddressInput = {
  label?: string | null;
  recipient?: string | null;
  phone?: string | null;
  phone_secondary?: string | null;
  street?: string | null;
  building?: string | null;
  floor?: string | null;
  apartment?: string | null;
  city?: string | null;
  governorate?: string | null;
  delivery_notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type AddressRowCompat = {
  id: string;
  label?: string | null;
  recipient?: string | null;
  full_name?: string | null;
  phone?: string | null;
  phone_secondary?: string | null;
  street?: string | null;
  building?: string | null;
  floor?: string | null;
  apartment?: string | null;
  city?: string | null;
  area?: string | null;
  governorate?: string | null;
  delivery_notes?: string | null;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean | null;
};

/** يقرأ recipient/city من الأعمدة الحديثة أو legacy (full_name / area). */
export function normalizeAddressRow(
  row: AddressRowCompat | null | undefined,
): AddressRowCompat | null {
  if (!row) return null;
  return {
    ...row,
    recipient: row.recipient ?? row.full_name ?? null,
    city: row.city ?? row.area ?? null,
    delivery_notes: row.delivery_notes ?? row.landmark ?? null,
  };
}

/**
 * صف إدراج متوافق مع مخطط Supabase الحالي (full_name, area, building NOT NULL)
 * ومع أعمدة التطبيق (recipient, city) بعد migration 0029.
 */
export function buildAddressInsertRow(
  userId: string,
  addr: AddressInput,
  fallback: { recipient: string; phone: string },
  coords: { latitude: number; longitude: number },
  options?: { isDefault?: boolean },
): Record<string, string | number | boolean | null> {
  const recipient =
    (addr.recipient ?? fallback.recipient).trim() || fallback.recipient;
  const city = (addr.city ?? "New Cairo").trim() || "New Cairo";
  const building = (addr.building ?? "").trim() || "-";
  const notes = addr.delivery_notes?.trim() || null;

  const row: Record<string, string | number | boolean | null> = {
    user_id: userId,
    label: (addr.label ?? "Home").trim() || "Home",
    recipient,
    phone: (addr.phone ?? fallback.phone).trim() || fallback.phone,
    street: (addr.street ?? "").trim() || "-",
    building,
    governorate: (addr.governorate ?? "Cairo").trim() || "Cairo",
    city,
    latitude: coords.latitude,
    longitude: coords.longitude,
    is_default: options?.isDefault ?? false,
  };

  if (addr.phone_secondary) row.phone_secondary = addr.phone_secondary;
  if (addr.floor) row.floor = addr.floor;
  if (addr.apartment) row.apartment = addr.apartment;
  if (notes) {
    row.delivery_notes = notes;
  }

  return row;
}

const ADDRESS_OPTIONAL_COLS = [
  "phone_secondary",
  "building",
  "floor",
  "apartment",
  "delivery_notes",
  "latitude",
  "longitude",
] as const;

/** إدراج عنوان مع إسقاط أعمدة غير موجودة بعد migrations قديمة. */
export function minimalAddressInsertRow(
  full: Record<string, string | number | boolean | null>,
): Record<string, string | number | boolean | null> {
  const minimal: Record<string, string | number | boolean | null> = {
    user_id: full.user_id,
    label: full.label,
    recipient: full.recipient,
    phone: full.phone,
    street: full.street,
    city: full.city,
    governorate: full.governorate ?? "Cairo",
    is_default: full.is_default,
  };
  if (full.building != null && String(full.building).trim()) {
    minimal.building = full.building;
  }
  return minimal;
}

export function stripMissingAddressColumns(
  row: Record<string, string | number | boolean | null>,
  errorMessage: string,
): Record<string, string | number | boolean | null> | null {
  if (!/column.*does not exist/i.test(errorMessage)) return null;
  const next = { ...row };
  for (const col of ADDRESS_OPTIONAL_COLS) {
    delete next[col];
  }
  return Object.keys(next).length > 0 ? next : null;
}

export function buildAddressUpdateRow(
  addr: AddressUpsertInput,
  coords: { latitude: number; longitude: number },
): Record<string, string | number | boolean | null> {
  const row: Record<string, string | number | boolean | null> = {
    label: addr.label.trim() || "Home",
    recipient: addr.recipient.trim(),
    phone: addr.phone,
    street: addr.street.trim(),
    building: addr.building?.trim() || "-",
    city: addr.city.trim(),
    governorate: addr.governorate.trim() || "Cairo",
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
  if (addr.phone_secondary) row.phone_secondary = addr.phone_secondary;
  if (addr.floor) row.floor = addr.floor;
  if (addr.apartment) row.apartment = addr.apartment;
  if (addr.delivery_notes) row.delivery_notes = addr.delivery_notes;
  if (addr.is_default != null) row.is_default = addr.is_default;
  return row;
}

export async function insertAddressWithFallback(
  supabase: SupabaseClient,
  row: Record<string, string | number | boolean | null>,
) {
  let { data, error } = await supabase.from("addresses").insert(row).select("*").single();
  if (error) {
    const stripped = stripMissingAddressColumns(row, error.message ?? "");
    if (stripped) {
      const retry = await supabase.from("addresses").insert(stripped).select("*").single();
      data = retry.data;
      error = retry.error;
    }
  }
  if (error) {
    const minimal = minimalAddressInsertRow(row);
    const retry = await supabase.from("addresses").insert(minimal).select("*").single();
    data = retry.data;
    error = retry.error;
  }
  return { data: data as AddressRowCompat | null, error };
}

export async function updateAddressWithFallback(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  row: Record<string, string | number | boolean | null>,
) {
  let { data, error } = await supabase
    .from("addresses")
    .update(row)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) {
    const stripped = stripMissingAddressColumns(row, error.message ?? "");
    if (stripped) {
      const retry = await supabase
        .from("addresses")
        .update(stripped)
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }
  }
  return { data: data as AddressRowCompat | null, error };
}

export async function listAddressesForUser(userId: string): Promise<AddressRowCompat[]> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listAddressesForUser error", error);
    return [];
  }
  return (data as AddressRowCompat[]).map((row) => normalizeAddressRow(row)!);
}

export async function countAddressesForUser(userId: string): Promise<number> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    console.error("countAddressesForUser error", error);
    return 0;
  }
  return count ?? 0;
}

export async function getAddressOwnedByUser(
  userId: string,
  addressId: string,
): Promise<AddressRowCompat | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("id", addressId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("getAddressOwnedByUser error", error);
    return null;
  }
  return normalizeAddressRow(data ?? undefined);
}

export async function clearDefaultAddressesForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
}
