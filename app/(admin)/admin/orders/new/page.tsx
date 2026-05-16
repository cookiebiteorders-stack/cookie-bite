"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/http/fetch-json";

type ProductRow = {
  id: string;
  name: string;
  title_en: string | null;
  price_egp: number;
};

type Line = { product_id: string; quantity: number };

export default function AdminNewManualOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: 1 }]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchJson<{ products: ProductRow[] }>("/api/admin/products?page=1&limit=100", {
          cache: "no-store",
        });
        if (!cancelled) setProducts(res.products ?? []);
      } catch {
        if (!cancelled) setError("تعذّر تحميل المنتجات.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    setError(null);
    const cleaned = lines.filter((l) => l.product_id && l.quantity > 0);
    if (!guestEmail.trim() || !guestPhone.trim() || !name.trim() || !street.trim() || !city.trim()) {
      setError("أكمل بيانات العميل والعنوان.");
      return;
    }
    if (cleaned.length === 0) {
      setError("أضف سطر منتج واحد على الأقل.");
      return;
    }
    setBusy(true);
    try {
      const payload = await fetchJson<{ order: { id: string } }>("/api/admin/orders", {
        method: "POST",
        jsonBody: {
          guest_email: guestEmail.trim(),
          guest_phone: guestPhone.trim(),
          shipping_address: { name: name.trim(), street: street.trim(), city: city.trim() },
          items: cleaned,
          payment_method: "cod",
          notes: notes.trim() || undefined,
        },
      });
      router.push(`/admin/orders`);
      router.refresh();
      window.sessionStorage.setItem("cb-admin-order-created", payload.order?.id ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل إنشاء الطلب");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl space-y-5 pb-16">
      <div>
        <Link href="/admin/orders" className="text-xs font-bold text-cb-terracotta-dark hover:underline">
          ← العودة للطلبات
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-bold text-cb-text-strong">طلب يدوي (POS)</h1>
        <p className="mt-1 text-sm text-cb-text-muted">إنشاء طلب COD مع بنود من الكتالوج.</p>
      </div>

      <label className="block text-xs font-bold uppercase text-cb-text-muted">
        البريد
        <input
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          type="email"
          className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-bold uppercase text-cb-text-muted">
        الهاتف
        <input
          value={guestPhone}
          onChange={(e) => setGuestPhone(e.target.value)}
          className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-bold uppercase text-cb-text-muted">
        اسم العميل
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-bold uppercase text-cb-text-muted">
        الشارع
        <input
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-bold uppercase text-cb-text-muted">
        المدينة
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
      </label>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase text-cb-text-muted">البنود</p>
        {lines.map((line, idx) => (
          <div key={idx} className="flex flex-wrap gap-2">
            <select
              value={line.product_id}
              onChange={(e) => {
                const v = e.target.value;
                setLines((prev) => prev.map((r, i) => (i === idx ? { ...r, product_id: v } : r)));
              }}
              className="min-w-[200px] flex-1 rounded-xl border border-cb-border bg-cb-surface px-2 py-2 text-sm"
            >
              <option value="">— منتج —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p.title_en ?? p.name).slice(0, 60)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={line.quantity}
              onChange={(e) => {
                const q = Number(e.target.value);
                setLines((prev) => prev.map((r, i) => (i === idx ? { ...r, quantity: q > 0 ? q : 1 } : r)));
              }}
              className="w-24 rounded-xl border border-cb-border bg-cb-surface px-2 py-2 text-sm"
            />
            <button
              type="button"
              className="rounded-xl border border-cb-border px-2 py-2 text-xs font-bold"
              onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
            >
              حذف
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-xs font-bold text-cb-terracotta-dark hover:underline"
          onClick={() => setLines((prev) => [...prev, { product_id: "", quantity: 1 }])}
        >
          + سطر
        </button>
      </div>

      <label className="block text-xs font-bold uppercase text-cb-text-muted">
        ملاحظات
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
      >
        {busy ? "جاري الإنشاء…" : "إنشاء الطلب"}
      </button>
    </section>
  );
}
