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
): Record<string, string | number | boolean | null> {
  const recipient =
    (addr.recipient ?? fallback.recipient).trim() || fallback.recipient;
  const city = (addr.city ?? "New Cairo").trim() || "New Cairo";
  const building = (addr.building ?? "").trim() || "-";
  const notes = addr.delivery_notes?.trim() || null;

  return {
    user_id: userId,
    label: (addr.label ?? "Home").trim() || "Home",
    recipient,
    full_name: recipient,
    phone: (addr.phone ?? fallback.phone).trim() || fallback.phone,
    phone_secondary: addr.phone_secondary ?? null,
    street: (addr.street ?? "").trim() || "-",
    building,
    floor: addr.floor ?? null,
    apartment: addr.apartment ?? null,
    city,
    area: city,
    governorate: (addr.governorate ?? "Cairo").trim() || "Cairo",
    delivery_notes: notes,
    landmark: notes,
    latitude: coords.latitude,
    longitude: coords.longitude,
    is_default: true,
  };
}
