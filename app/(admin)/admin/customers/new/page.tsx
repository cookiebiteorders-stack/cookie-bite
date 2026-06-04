"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, UserPlus } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";

export default function AdminNewCustomerPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [notes, setNotes] = useState("");
  const [points, setPoints] = useState("0");
  const [recipient, setRecipient] = useState("");
  const [addressPhone, setAddressPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [label, setLabel] = useState("المنزل");
  const [includeAddress, setIncludeAddress] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !fullName.trim()) {
      setError("الاسم والبريد مطلوبان.");
      return;
    }
    if (includeAddress) {
      const ap = addressPhone.trim() || phone.trim();
      if (!recipient.trim() || !ap || !street.trim() || !city.trim()) {
        setError("أكمل حقول العنوان أو عطّل إضافة العنوان.");
        return;
      }
    }

    setBusy(true);
    try {
      const payload = await fetchJson<{ customer: { id: string } }>("/api/admin/customers", {
        method: "POST",
        jsonBody: {
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim() || undefined,
          phone_secondary: phoneSecondary.trim() || undefined,
          profile_notes: notes.trim() || undefined,
          points: Math.max(0, parseInt(points, 10) || 0),
          ...(includeAddress
            ? {
                address: {
                  label: label.trim() || "المنزل",
                  recipient: recipient.trim() || fullName.trim(),
                  phone: (addressPhone.trim() || phone.trim()),
                  street: street.trim(),
                  city: city.trim(),
                  governorate: governorate.trim() || undefined,
                  is_default: true,
                },
              }
            : {}),
        },
      });
      router.push(`/admin/customers?created=${payload.customer?.id ?? ""}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل إنشاء العميل");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "mt-1 w-full rounded-xl border border-cb-border bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm";

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/customers"
          className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
          العودة إلى CRM
        </Link>
      </div>

      <div className="admin-panel-surface rounded-2xl border border-cb-border p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
            <UserPlus className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="font-serif text-xl font-bold text-stone-950">إضافة عميل جديد</h1>
            <p className="text-sm text-stone-600">البيانات تُحفظ في قاعدة البيانات وتُزامَن مع جهات اتصال البريد عند التفعيل.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-stone-800 sm:col-span-2">
            الاسم الكامل *
            <input className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            البريد الإلكتروني *
            <input
              type="email"
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              dir="ltr"
            />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            الهاتف
            <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            هاتف إضافي
            <input className={field} value={phoneSecondary} onChange={(e) => setPhoneSecondary(e.target.value)} dir="ltr" />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            نقاط الولاء
            <input
              type="number"
              min={0}
              className={field}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold text-stone-800 sm:col-span-2">
            ملاحظات داخلية
            <textarea className={cn(field, "min-h-[88px]")} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="mt-8 border-t border-cb-border pt-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-stone-800">
            <input
              type="checkbox"
              checked={includeAddress}
              onChange={(e) => setIncludeAddress(e.target.checked)}
              className="rounded border-stone-300"
            />
            إضافة عنوان توصيل
          </label>

          {includeAddress ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-stone-800">
                تسمية العنوان
                <input className={field} value={label} onChange={(e) => setLabel(e.target.value)} />
              </label>
              <label className="block text-sm font-semibold text-stone-800">
                اسم المستلم
                <input className={field} value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={fullName || "مثل: أحمد محمد"} />
              </label>
              <label className="block text-sm font-semibold text-stone-800">
                هاتف التوصيل
                <input className={field} value={addressPhone} onChange={(e) => setAddressPhone(e.target.value)} placeholder={phone || ""} dir="ltr" />
              </label>
              <label className="block text-sm font-semibold text-stone-800 sm:col-span-2">
                الشارع / التفاصيل *
                <input className={field} value={street} onChange={(e) => setStreet(e.target.value)} />
              </label>
              <label className="block text-sm font-semibold text-stone-800">
                المدينة *
                <input className={field} value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
              <label className="block text-sm font-semibold text-stone-800">
                المحافظة
                <input className={field} value={governorate} onChange={(e) => setGovernorate(e.target.value)} />
              </label>
            </div>
          ) : null}
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="admin-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            حفظ العميل
          </button>
          <Link href="/admin/customers" className="admin-btn-secondary rounded-xl px-5 py-2.5 text-sm font-bold">
            إلغاء
          </Link>
        </div>
      </div>
    </div>
  );
}
