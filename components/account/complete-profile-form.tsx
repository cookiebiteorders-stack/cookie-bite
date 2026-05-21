"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddressMapPicker } from "@/components/account/address-map-picker";
import { buttonClassName } from "@/components/ui/button";
import { fetchJson } from "@/lib/http/fetch-json";
import { normalizeEgyptPhone } from "@/lib/account/profile-schema";
import { cn } from "@/lib/utils";

const EGYPT_GOVERNORATES = [
  "Cairo",
  "Giza",
  "Qalyubia",
  "Alexandria",
  "Sharqia",
  "Dakahlia",
  "Other",
] as const;

type FormState = {
  full_name_en: string;
  full_name_ar: string;
  phone: string;
  phone_secondary: string;
  profile_notes: string;
  recipient: string;
  address_phone: string;
  address_phone_secondary: string;
  label: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  city: string;
  governorate: string;
  delivery_notes: string;
  latitude: number | null;
  longitude: number | null;
};

const INITIAL: FormState = {
  full_name_en: "",
  full_name_ar: "",
  phone: "",
  phone_secondary: "",
  profile_notes: "",
  recipient: "",
  address_phone: "",
  address_phone_secondary: "",
  label: "Home",
  street: "",
  building: "",
  floor: "",
  apartment: "",
  city: "New Cairo",
  governorate: "Cairo",
  delivery_notes: "",
  latitude: 30.0444,
  longitude: 31.2357,
};

export function CompleteProfileForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/account/provision", { method: "POST" }).catch(() => null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchJson<{
          profile: {
            full_name_en?: string | null;
            full_name_ar?: string | null;
            phone?: string | null;
            phone_secondary?: string | null;
            profile_notes?: string | null;
            full_name?: string | null;
          };
          complete: boolean;
          default_address?: {
            recipient?: string;
            phone?: string;
            phone_secondary?: string | null;
            label?: string | null;
            street?: string;
            building?: string | null;
            city?: string;
            governorate?: string | null;
            delivery_notes?: string | null;
            latitude?: number | null;
            longitude?: number | null;
          } | null;
        }>("/api/account/profile");
        if (cancelled) return;
        if (data.complete) {
          router.replace("/account");
          return;
        }
        const p = data.profile;
        const a = data.default_address;
        setForm((f) => ({
          ...f,
          full_name_en: p.full_name_en ?? p.full_name ?? f.full_name_en,
          full_name_ar: p.full_name_ar ?? f.full_name_ar,
          phone: p.phone ?? f.phone,
          phone_secondary: p.phone_secondary ?? "",
          profile_notes: p.profile_notes ?? "",
          recipient: a?.recipient ?? p.full_name_en ?? p.full_name ?? "",
          address_phone: a?.phone ?? p.phone ?? "",
          address_phone_secondary: a?.phone_secondary ?? "",
          label: a?.label ?? "Home",
          street: a?.street ?? "",
          building: a?.building ?? "",
          city: a?.city ?? "New Cairo",
          governorate: a?.governorate ?? "Cairo",
          delivery_notes: a?.delivery_notes ?? "",
          latitude: a?.latitude ?? f.latitude,
          longitude: a?.longitude ?? f.longitude,
        }));
      } catch {
        /* first visit */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onMapChange = useCallback((lat: number, lng: number) => {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
  }, []);

  const buildPayload = useCallback(() => {
    const phone = normalizeEgyptPhone(form.phone);
    const phoneSecondary = normalizeEgyptPhone(form.phone_secondary);
    const addressPhone = normalizeEgyptPhone(
      form.address_phone || form.phone,
    );
    const addressPhoneSecondary = normalizeEgyptPhone(
      form.address_phone_secondary,
    );

    const hasAddress =
      form.street.trim() &&
      form.recipient.trim() &&
      addressPhone &&
      form.city.trim();

    return {
      full_name_en: form.full_name_en.trim() || null,
      full_name_ar: form.full_name_ar.trim() || null,
      phone: phone || null,
      phone_secondary: phoneSecondary || null,
      profile_notes: form.profile_notes.trim() || null,
      address: hasAddress
        ? {
            label: form.label.trim() || "Home",
            recipient: form.recipient.trim(),
            phone: addressPhone,
            phone_secondary: addressPhoneSecondary || null,
            street: form.street.trim(),
            building: form.building.trim() || null,
            floor: form.floor.trim() || null,
            apartment: form.apartment.trim() || null,
            city: form.city.trim(),
            governorate: form.governorate.trim() || null,
            delivery_notes: form.delivery_notes.trim() || null,
            latitude: form.latitude ?? undefined,
            longitude: form.longitude ?? undefined,
          }
        : null,
    };
  }, [form]);

  const submit = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      await fetchJson("/api/account/profile", {
        method: "POST",
        jsonBody: buildPayload(),
      });
      router.replace("/account");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }, [buildPayload, router]);

  const skip = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      await fetchJson("/api/account/profile", {
        method: "POST",
        jsonBody: { skip_profile: true },
      });
      router.replace("/account");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر المتابعة");
    } finally {
      setSaving(false);
    }
  }, [router]);

  if (loading) {
    return (
      <p className="text-sm text-cb-text-muted" dir="rtl">
        جاري التحميل…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      <header className="space-y-2 text-center sm:text-start">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
          أكمل ملفك الشخصي
        </h1>
        <p className="text-sm text-cb-text-muted" dir="rtl">
          كل الحقول اختيارية — أضف ما تريد الآن أو تخطَّ وأكمل لاحقاً من حسابك. عند إدخال
          رقم مصر استخدم 11 رقمًا يبدأ بـ 01.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h2 className="font-serif text-lg font-semibold text-cb-text-strong">البيانات الشخصية</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-cb-text-muted">Full name (EN)</span>
            <input
              className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              value={form.full_name_en}
              onChange={(e) => setForm((f) => ({ ...f, full_name_en: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-cb-text-muted">الاسم الكامل (عربي)</span>
            <input
              className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              dir="rtl"
              value={form.full_name_ar}
              onChange={(e) => setForm((f) => ({ ...f, full_name_ar: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-cb-text-muted">Mobile</span>
            <input
              className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              placeholder="01xxxxxxxxx"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  phone: e.target.value,
                  address_phone: f.address_phone || e.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-cb-text-muted">رقم ثانوي (اختياري)</span>
            <input
              className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              placeholder="01xxxxxxxxx"
              value={form.phone_secondary}
              onChange={(e) => setForm((f) => ({ ...f, phone_secondary: e.target.value }))}
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold text-cb-text-muted">ملاحظات إضافية (اختياري)</span>
            <textarea
              className="min-h-20 w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              dir="rtl"
              value={form.profile_notes}
              onChange={(e) => setForm((f) => ({ ...f, profile_notes: e.target.value }))}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
          عنوان التوصيل <span className="text-sm font-normal text-cb-text-muted">(اختياري)</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold text-cb-text-muted">اسم المستلم</span>
            <input
              className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              value={form.recipient}
              onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-cb-text-muted">هاتف التوصيل</span>
            <input
              className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              value={form.address_phone}
              onChange={(e) => setForm((f) => ({ ...f, address_phone: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-cb-text-muted">هاتف ثانوي للعنوان</span>
            <input
              className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              value={form.address_phone_secondary}
              onChange={(e) =>
                setForm((f) => ({ ...f, address_phone_secondary: e.target.value }))
              }
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold text-cb-text-muted">الشارع / الحي</span>
            <input
              className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              dir="rtl"
              value={form.street}
              onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-cb-text-muted">مبنى</span>
            <input
              className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              value={form.building}
              onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-cb-text-muted">دور</span>
            <input
              className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              value={form.floor}
              onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-cb-text-muted">شقة</span>
            <input
              className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              value={form.apartment}
              onChange={(e) => setForm((f) => ({ ...f, apartment: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-cb-text-muted">المدينة</span>
            <input
              className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-cb-text-muted">المحافظة</span>
            <select
              className="w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
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
              className="min-h-16 w-full rounded-xl border border-cb-border px-3 py-2 text-sm"
              dir="rtl"
              value={form.delivery_notes}
              onChange={(e) => setForm((f) => ({ ...f, delivery_notes: e.target.value }))}
            />
          </label>
        </div>

        <AddressMapPicker
          latitude={form.latitude}
          longitude={form.longitude}
          onChange={onMapChange}
        />
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          disabled={saving}
          className={cn(buttonClassName("primary"), "w-full px-8 py-3 text-base sm:w-auto")}
          onClick={() => void submit()}
        >
          {saving ? "جاري الحفظ…" : "حفظ والمتابعة"}
        </button>
        <button
          type="button"
          disabled={saving}
          className={cn(
            buttonClassName("outline"),
            "w-full border-2 border-cb-border px-8 py-3 text-base sm:w-auto",
          )}
          onClick={() => void skip()}
        >
          تخطي الآن
        </button>
      </div>
    </div>
  );
}
