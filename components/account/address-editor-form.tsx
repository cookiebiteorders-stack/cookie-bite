"use client";

import { useCallback, useState } from "react";
import {
  AddressMapPicker,
  type AddressMapHint,
} from "@/components/account/address-map-picker";
import { EGYPT_GOVERNORATES } from "@/lib/account/address-schema";
import type { AddressRowCompat } from "@/lib/db/addresses";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong placeholder:text-cb-text-muted";

export type AddressFormValues = {
  label: string;
  recipient: string;
  phone: string;
  phone_secondary: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  city: string;
  governorate: string;
  delivery_notes: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
};

export const EMPTY_ADDRESS_FORM: AddressFormValues = {
  label: "Home",
  recipient: "",
  phone: "",
  phone_secondary: "",
  street: "",
  building: "",
  floor: "",
  apartment: "",
  city: "New Cairo",
  governorate: "Cairo",
  delivery_notes: "",
  latitude: 30.0444,
  longitude: 31.2357,
  is_default: false,
};

export function addressRowToFormValues(row: AddressRowCompat): AddressFormValues {
  return {
    label: row.label ?? "Home",
    recipient: row.recipient ?? "",
    phone: row.phone ?? "",
    phone_secondary: row.phone_secondary ?? "",
    street: row.street ?? "",
    building: row.building ?? "",
    floor: row.floor ?? "",
    apartment: row.apartment ?? "",
    city: row.city ?? "New Cairo",
    governorate: row.governorate ?? "Cairo",
    delivery_notes: row.delivery_notes ?? "",
    latitude: row.latitude ?? 30.0444,
    longitude: row.longitude ?? 31.2357,
    is_default: Boolean(row.is_default),
  };
}

type Props = {
  initial: AddressFormValues;
  submitLabel: string;
  saving?: boolean;
  onSubmit: (values: AddressFormValues) => void | Promise<void>;
  onCancel?: () => void;
};

export function AddressEditorForm({
  initial,
  submitLabel,
  saving = false,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<AddressFormValues>(initial);

  const onMapChange = useCallback((lat: number, lng: number) => {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
  }, []);

  const onAddressHint = useCallback((hint: AddressMapHint) => {
    setForm((f) => ({
      ...f,
      street: f.street.trim() ? f.street : (hint.street?.trim() ?? f.street),
      city:
        f.city.trim() && f.city !== "New Cairo"
          ? f.city
          : (hint.city?.trim() ?? f.city),
      governorate:
        f.governorate.trim() && f.governorate !== "Cairo"
          ? f.governorate
          : (hint.governorate?.trim() ?? f.governorate),
    }));
  }, []);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(form);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-cb-text-muted">تسمية العنوان</span>
          <input
            className={inputClass}
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="المنزل، العمل…"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-cb-text-muted">اسم المستلم</span>
          <input
            className={inputClass}
            required
            value={form.recipient}
            onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-cb-text-muted">هاتف التوصيل</span>
          <input
            className={inputClass}
            required
            placeholder="01xxxxxxxxx"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-cb-text-muted">هاتف ثانوي (اختياري)</span>
          <input
            className={inputClass}
            placeholder="01xxxxxxxxx"
            value={form.phone_secondary}
            onChange={(e) => setForm((f) => ({ ...f, phone_secondary: e.target.value }))}
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-cb-text-muted">الشارع / الحي</span>
          <input
            className={inputClass}
            required
            dir="rtl"
            value={form.street}
            onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-cb-text-muted">مبنى</span>
          <input
            className={inputClass}
            value={form.building}
            onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-cb-text-muted">دور</span>
          <input
            className={inputClass}
            value={form.floor}
            onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-cb-text-muted">شقة</span>
          <input
            className={inputClass}
            value={form.apartment}
            onChange={(e) => setForm((f) => ({ ...f, apartment: e.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-cb-text-muted">المدينة</span>
          <input
            className={inputClass}
            required
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-cb-text-muted">المحافظة</span>
          <select
            className={inputClass}
            value={form.governorate}
            onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value }))}
          >
            {EGYPT_GOVERNORATES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-cb-text-muted">تعليمات للسائق</span>
          <textarea
            className={cn(inputClass, "min-h-16")}
            dir="rtl"
            value={form.delivery_notes}
            onChange={(e) => setForm((f) => ({ ...f, delivery_notes: e.target.value }))}
          />
        </label>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
            className="h-4 w-4 rounded border-cb-border text-cb-terracotta-dark"
          />
          <span className="text-sm font-medium text-cb-text-strong">عنوان افتراضي للتوصيل</span>
        </label>
      </div>

      <AddressMapPicker
        latitude={form.latitude}
        longitude={form.longitude}
        onChange={onMapChange}
        onAddressHint={onAddressHint}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className={buttonClassName("primary", "rounded-full px-6 py-2.5 text-sm")}
        >
          {saving ? "جاري الحفظ…" : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className={buttonClassName("outline", "rounded-full px-6 py-2.5 text-sm")}
          >
            إلغاء
          </button>
        ) : null}
      </div>
    </form>
  );
}
