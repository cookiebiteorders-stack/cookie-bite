"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Plus, Search, Trash2, X } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import {
  type ManualInvoiceDocument,
  INVOICE_LIFECYCLE_STATUSES,
  PAYMENT_METHODS,
  computeInvoiceTotals,
  createEmptyManualInvoiceDocument,
  emptyManualInvoiceLine,
} from "@/lib/invoices/manual-invoice";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-cb-border/70 bg-white px-3 py-2 text-sm text-cb-text-strong shadow-sm focus:border-cb-terracotta-dark focus:outline-none focus:ring-2 focus:ring-cb-terracotta-dark/20";

const labelClass = "text-xs font-bold text-cb-text-strong";

type CustomerOption = {
  id: string;
  full_name: string | null;
  email: string;
  phone?: string | null;
};

type ProductOption = {
  id: string;
  name: string;
  price_egp: number;
};

export type ManualInvoiceEditTarget = {
  id: string;
  invoice_number: string;
  issued_at: string;
  due_at: string | null;
  currency: string;
  document: ManualInvoiceDocument;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget?: ManualInvoiceEditTarget | null;
  onCreated?: (invoiceNumber: string) => void;
  onUpdated?: (invoiceNumber: string) => void;
};

function toDateInputValue(iso?: string): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10);
}

function dateInputToIso(date: string, endOfDay = false): string {
  const suffix = endOfDay ? "T23:59:59.999Z" : "T12:00:00.000Z";
  return new Date(`${date}${suffix}`).toISOString();
}

function money(n: number): string {
  return `EGP ${n.toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ManualInvoiceDrawer({
  open,
  onOpenChange,
  editTarget = null,
  onCreated,
  onUpdated,
}: Props) {
  const isEdit = Boolean(editTarget?.id);
  const reduceMotion = useReducedMotion();
  const [doc, setDoc] = useState<ManualInvoiceDocument>(() => createEmptyManualInvoiceDocument());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issuedDate, setIssuedDate] = useState(() => toDateInputValue());
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toDateInputValue(d.toISOString());
  });
  const [currency, setCurrency] = useState("EGP");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState<CustomerOption[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [productHits, setProductHits] = useState<ProductOption[]>([]);

  const totals = useMemo(() => computeInvoiceTotals(doc), [doc]);

  const resetForm = useCallback(() => {
    setDoc(createEmptyManualInvoiceDocument());
    setInvoiceNumber("");
    setIssuedDate(toDateInputValue());
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDueDate(toDateInputValue(d.toISOString()));
    setCurrency("EGP");
    setError(null);
    setCustomerQuery("");
    setProductHits([]);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      setDoc(editTarget.document);
      setInvoiceNumber(editTarget.invoice_number);
      setIssuedDate(toDateInputValue(editTarget.issued_at));
      setDueDate(
        editTarget.due_at
          ? toDateInputValue(editTarget.due_at)
          : toDateInputValue(
              new Date(Date.now() + 7 * 86400000).toISOString(),
            ),
      );
      setCurrency(editTarget.currency || "EGP");
      setError(null);
      setCustomerQuery("");
      setCustomerHits([]);
      return;
    }
    resetForm();
  }, [open, editTarget, resetForm]);

  useEffect(() => {
    if (!open || customerQuery.trim().length < 2) {
      setCustomerHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void fetch(`/api/admin/customers?search=${encodeURIComponent(customerQuery)}&limit=8`, {
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((payload: { customers?: CustomerOption[] }) => {
          setCustomerHits(payload.customers ?? []);
        })
        .catch(() => setCustomerHits([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [customerQuery, open]);

  useEffect(() => {
    if (!open || productQuery.trim().length < 2) {
      setProductHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void fetch(`/api/admin/products?search=${encodeURIComponent(productQuery)}&limit=10`, {
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((payload: { products?: Array<{ id: string; name: string; price_egp: number }> }) => {
          setProductHits(
            (payload.products ?? []).map((p) => ({
              id: p.id,
              name: p.name,
              price_egp: Number(p.price_egp),
            })),
          );
        })
        .catch(() => setProductHits([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [productQuery, open]);

  const applyCustomer = (c: CustomerOption) => {
    setDoc((d) => ({
      ...d,
      client: {
        ...d.client,
        client_id: c.id,
        name: c.full_name?.trim() || c.email,
        email: c.email,
        phone: c.phone ?? d.client.phone,
      },
    }));
    setCustomerQuery("");
    setCustomerHits([]);
  };

  const addProductLine = (p: ProductOption) => {
    setDoc((d) => ({
      ...d,
      items: [
        ...d.items,
        {
          ...emptyManualInvoiceLine(),
          name: p.name,
          unit_price: p.price_egp,
        },
      ],
    }));
    setProductQuery("");
    setProductHits([]);
  };

  const updateItem = (id: string, patch: Partial<ManualInvoiceDocument["items"][0]>) => {
    setDoc((d) => ({
      ...d,
      items: d.items.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  };

  const removeItem = (id: string) => {
    setDoc((d) => {
      const next = d.items.filter((row) => row.id !== id);
      return { ...d, items: next.length ? next : [emptyManualInvoiceLine()] };
    });
  };

  const submit = async () => {
    setError(null);
    if (!doc.client.name.trim()) {
      setError("اسم العميل مطلوب.");
      return;
    }
    if (doc.items.every((i) => !i.name.trim())) {
      setError("أضف بنداً واحداً على الأقل.");
      return;
    }
    const cleaned: ManualInvoiceDocument = {
      ...doc,
      items: doc.items
        .filter((i) => i.name.trim())
        .map((i) => ({
          ...i,
          name: i.name.trim(),
          quantity: Math.max(0.01, Number(i.quantity) || 1),
          unit_price: Math.max(0, Number(i.unit_price) || 0),
        })),
    };
    if (cleaned.lifecycle_status === "paid") {
      cleaned.payment.status = "paid";
      cleaned.summary.amount_paid = totals.grand_total;
    }

    setSaving(true);
    try {
      const body = {
        invoice_number: invoiceNumber.trim() || undefined,
        issued_at: dateInputToIso(issuedDate),
        due_at: dateInputToIso(dueDate, true),
        currency,
        order_id: cleaned.reference_order_id ?? null,
        document: cleaned,
      };
      const res = await fetch(
        isEdit && editTarget
          ? `/api/admin/invoices/${editTarget.id}`
          : "/api/admin/invoices",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        invoice?: { invoice_number?: string };
        error?: { en?: string; ar?: string };
      };
      if (!res.ok) {
        throw new Error(
          payload.error?.ar ??
            payload.error?.en ??
            (isEdit ? "فشل تحديث الفاتورة" : "فشل إنشاء الفاتورة"),
        );
      }
      const num = payload.invoice?.invoice_number ?? invoiceNumber;
      if (isEdit) onUpdated?.(num);
      else onCreated?.(num);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير معروف");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] flex justify-end bg-black/45 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-invoice-title"
            className="flex h-full w-full max-w-4xl flex-col border-s border-cb-border bg-[#f5f2eb] shadow-2xl"
            initial={reduceMotion ? false : { x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { x: 32, opacity: 0 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-cb-border bg-white/95 px-5 py-4">
              <div>
                <h2 id="manual-invoice-title" className="font-serif text-xl font-bold text-cb-text-strong">
                  {isEdit ? "تعديل الفاتورة" : "إنشاء فاتورة يدوية"}
                </h2>
                <p className="mt-1 text-xs text-cb-text-muted">
                  {isEdit
                    ? "عدّل البيانات ثم احفظ — يمكنك تصدير PDF من القائمة"
                    : "حساب تلقائي للمجاميع · PDF بعد الحفظ"}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-cb-border p-2 text-cb-text-muted hover:bg-cb-peach/40"
                onClick={() => onOpenChange(false)}
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {error ? (
                <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-cb-border bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-cb-terracotta-dark">🧾 هوية الفاتورة</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className={labelClass}>رقم الفاتورة (فارغ = تلقائي)</span>
                      <input
                        className={cn(fieldClass, "mt-1 font-mono")}
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="INV-2026-0001"
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>تاريخ الفاتورة</span>
                      <input
                        type="date"
                        className={cn(fieldClass, "mt-1")}
                        value={issuedDate}
                        onChange={(e) => setIssuedDate(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>تاريخ الاستحقاق</span>
                      <input
                        type="date"
                        className={cn(fieldClass, "mt-1")}
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>الحالة</span>
                      <select
                        className={cn(fieldClass, "mt-1")}
                        value={doc.lifecycle_status}
                        onChange={(e) =>
                          setDoc((d) => ({
                            ...d,
                            lifecycle_status: e.target.value as ManualInvoiceDocument["lifecycle_status"],
                          }))
                        }
                      >
                        {INVOICE_LIFECYCLE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelClass}>العملة</span>
                      <select
                        className={cn(fieldClass, "mt-1")}
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        <option value="EGP">EGP</option>
                        <option value="USD">USD</option>
                      </select>
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={labelClass}>مرجع طلب (UUID اختياري)</span>
                      <input
                        className={cn(fieldClass, "mt-1 font-mono text-xs")}
                        value={doc.reference_order_id ?? ""}
                        onChange={(e) =>
                          setDoc((d) => ({
                            ...d,
                            reference_order_id: e.target.value.trim() || null,
                          }))
                        }
                        placeholder="order uuid"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-cb-border bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-cb-terracotta-dark">👤 العميل</h3>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cb-text-muted" />
                    <input
                      className={cn(fieldClass, "mt-0 ps-9")}
                      placeholder="بحث بالاسم أو البريد…"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                    />
                    {customerHits.length > 0 ? (
                      <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-xl border border-cb-border bg-white py-1 shadow-lg">
                        {customerHits.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-start text-sm hover:bg-cb-peach/40"
                              onClick={() => applyCustomer(c)}
                            >
                              <span className="font-semibold">{c.full_name ?? c.email}</span>
                              <span className="block text-xs text-cb-text-muted">{c.email}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2">
                    <input
                      className={fieldClass}
                      placeholder="اسم العميل *"
                      value={doc.client.name}
                      onChange={(e) =>
                        setDoc((d) => ({ ...d, client: { ...d.client, name: e.target.value } }))
                      }
                    />
                    <input
                      className={fieldClass}
                      placeholder="اسم الشركة"
                      value={doc.client.company_name ?? ""}
                      onChange={(e) =>
                        setDoc((d) => ({
                          ...d,
                          client: { ...d.client, company_name: e.target.value },
                        }))
                      }
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        className={fieldClass}
                        placeholder="البريد"
                        value={doc.client.email}
                        onChange={(e) =>
                          setDoc((d) => ({ ...d, client: { ...d.client, email: e.target.value } }))
                        }
                      />
                      <input
                        className={fieldClass}
                        placeholder="الهاتف"
                        value={doc.client.phone}
                        onChange={(e) =>
                          setDoc((d) => ({ ...d, client: { ...d.client, phone: e.target.value } }))
                        }
                      />
                    </div>
                    <textarea
                      className={cn(fieldClass, "min-h-16 resize-y")}
                      placeholder="عنوان الفوترة"
                      value={doc.client.billing_address}
                      onChange={(e) =>
                        setDoc((d) => ({
                          ...d,
                          client: { ...d.client, billing_address: e.target.value },
                        }))
                      }
                    />
                    <textarea
                      className={cn(fieldClass, "min-h-14 resize-y")}
                      placeholder="عنوان الشحن (اختياري)"
                      value={doc.client.shipping_address ?? ""}
                      onChange={(e) =>
                        setDoc((d) => ({
                          ...d,
                          client: { ...d.client, shipping_address: e.target.value },
                        }))
                      }
                    />
                  </div>
                </section>
              </div>

              <section className="mt-4 rounded-2xl border border-cb-border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-cb-terracotta-dark">📦 بنود الفاتورة</h3>
                  <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
                    <input
                      className={fieldClass}
                      placeholder="إضافة منتج من الكتالوج…"
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                    />
                    {productHits.length > 0 ? (
                      <ul className="absolute z-10 mt-1 max-h-36 w-full overflow-auto rounded-xl border border-cb-border bg-white py-1 shadow-lg">
                        {productHits.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-cb-peach/40"
                              onClick={() => addProductLine(p)}
                            >
                              <span className="truncate font-medium">{p.name}</span>
                              <span className="shrink-0 text-xs font-bold text-cb-terracotta-dark">
                                {money(p.price_egp)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={buttonClassName("outline", "px-3 py-1.5 text-xs")}
                    onClick={() =>
                      setDoc((d) => ({ ...d, items: [...d.items, emptyManualInvoiceLine()] }))
                    }
                  >
                    <Plus className="h-4 w-4" />
                    بند جديد
                  </button>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-cb-border text-start text-[10px] font-bold uppercase tracking-wide text-cb-text-muted">
                        <th className="px-2 py-2">الوصف</th>
                        <th className="px-2 py-2 w-20">كمية</th>
                        <th className="px-2 py-2 w-24">سعر</th>
                        <th className="px-2 py-2 w-16">خصم%</th>
                        <th className="px-2 py-2 w-16">ضريبة%</th>
                        <th className="px-2 py-2 w-28">الإجمالي</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {totals.lines.map((line) => (
                        <tr key={line.id} className="border-b border-cb-border/60">
                          <td className="px-1 py-1">
                            <input
                              className={fieldClass}
                              value={line.name}
                              onChange={(e) => updateItem(line.id, { name: e.target.value })}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              min={0.01}
                              step={0.01}
                              className={fieldClass}
                              value={line.quantity}
                              onChange={(e) =>
                                updateItem(line.id, { quantity: Number(e.target.value) })
                              }
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className={fieldClass}
                              value={line.unit_price}
                              onChange={(e) =>
                                updateItem(line.id, { unit_price: Number(e.target.value) })
                              }
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className={fieldClass}
                              value={line.discount_percent}
                              onChange={(e) =>
                                updateItem(line.id, { discount_percent: Number(e.target.value) })
                              }
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className={fieldClass}
                              value={line.tax_rate}
                              onChange={(e) =>
                                updateItem(line.id, { tax_rate: Number(e.target.value) })
                              }
                            />
                          </td>
                          <td className="px-2 py-2 text-end font-bold tabular-nums">
                            {money(line.line_total)}
                          </td>
                          <td className="px-1 py-1">
                            <button
                              type="button"
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                              onClick={() => removeItem(line.id)}
                              aria-label="حذف البند"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-cb-border bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-cb-terracotta-dark">🏪 البائع</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      className={cn(fieldClass, "sm:col-span-2")}
                      value={doc.seller.name}
                      onChange={(e) =>
                        setDoc((d) => ({ ...d, seller: { ...d.seller, name: e.target.value } }))
                      }
                    />
                    <input
                      className={fieldClass}
                      value={doc.seller.email}
                      onChange={(e) =>
                        setDoc((d) => ({ ...d, seller: { ...d.seller, email: e.target.value } }))
                      }
                    />
                    <input
                      className={fieldClass}
                      value={doc.seller.phone}
                      onChange={(e) =>
                        setDoc((d) => ({ ...d, seller: { ...d.seller, phone: e.target.value } }))
                      }
                    />
                    <input
                      className={cn(fieldClass, "sm:col-span-2")}
                      value={doc.seller.address}
                      onChange={(e) =>
                        setDoc((d) => ({ ...d, seller: { ...d.seller, address: e.target.value } }))
                      }
                    />
                    <input
                      className={fieldClass}
                      placeholder="الرقم الضريبي"
                      value={doc.seller.tax_id}
                      onChange={(e) =>
                        setDoc((d) => ({ ...d, seller: { ...d.seller, tax_id: e.target.value } }))
                      }
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-amber-900">💰 الملخص</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-cb-text-muted">المجموع الفرعي</dt>
                      <dd className="font-semibold tabular-nums">{money(totals.subtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-cb-text-muted">إجمالي الخصم</dt>
                      <dd className="font-semibold tabular-nums">− {money(totals.total_discount)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-cb-text-muted">إجمالي الضريبة</dt>
                      <dd className="font-semibold tabular-nums">{money(totals.total_tax)}</dd>
                    </div>
                    <label className="flex items-center justify-between gap-2">
                      <span className="text-cb-text-muted">خصم على الفاتورة %</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className={cn(fieldClass, "w-20")}
                        value={doc.summary.invoice_discount_percent}
                        onChange={(e) =>
                          setDoc((d) => ({
                            ...d,
                            summary: {
                              ...d.summary,
                              invoice_discount_percent: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2">
                      <span className="text-cb-text-muted">شحن</span>
                      <input
                        type="number"
                        min={0}
                        className={cn(fieldClass, "w-28")}
                        value={doc.summary.shipping_fees}
                        onChange={(e) =>
                          setDoc((d) => ({
                            ...d,
                            summary: { ...d.summary, shipping_fees: Number(e.target.value) },
                          }))
                        }
                      />
                    </label>
                    <div className="flex justify-between border-t border-amber-200/80 pt-3 text-base">
                      <dt className="font-bold text-amber-950">الإجمالي الكلي</dt>
                      <dd className="font-bold tabular-nums text-amber-950">
                        {money(totals.grand_total)}
                      </dd>
                    </div>
                    <label className="flex items-center justify-between gap-2">
                      <span className="text-cb-text-muted">مدفوع</span>
                      <input
                        type="number"
                        min={0}
                        className={cn(fieldClass, "w-28")}
                        value={doc.summary.amount_paid}
                        onChange={(e) =>
                          setDoc((d) => ({
                            ...d,
                            summary: { ...d.summary, amount_paid: Number(e.target.value) },
                          }))
                        }
                      />
                    </label>
                    <div className="flex justify-between font-semibold">
                      <dt>المتبقي</dt>
                      <dd className="tabular-nums">{money(totals.balance)}</dd>
                    </div>
                  </dl>
                </section>
              </div>

              <section className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-cb-border bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-cb-terracotta-dark">💳 الدفع</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <select
                      className={fieldClass}
                      value={doc.payment.method}
                      onChange={(e) =>
                        setDoc((d) => ({
                          ...d,
                          payment: { ...d.payment, method: e.target.value as typeof d.payment.method },
                        }))
                      }
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      className={fieldClass}
                      value={doc.payment.status}
                      onChange={(e) =>
                        setDoc((d) => ({
                          ...d,
                          payment: {
                            ...d.payment,
                            status: e.target.value as typeof d.payment.status,
                          },
                        }))
                      }
                    >
                      <option value="pending">pending</option>
                      <option value="paid">paid</option>
                      <option value="partial">partial</option>
                      <option value="failed">failed</option>
                    </select>
                    <input
                      className={cn(fieldClass, "sm:col-span-2")}
                      placeholder="معرّف المعاملة"
                      value={doc.payment.transaction_id ?? ""}
                      onChange={(e) =>
                        setDoc((d) => ({
                          ...d,
                          payment: { ...d.payment, transaction_id: e.target.value },
                        }))
                      }
                    />
                    <input
                      type="date"
                      className={cn(fieldClass, "sm:col-span-2")}
                      value={
                        doc.payment.payment_date
                          ? toDateInputValue(doc.payment.payment_date)
                          : ""
                      }
                      onChange={(e) =>
                        setDoc((d) => ({
                          ...d,
                          payment: {
                            ...d.payment,
                            payment_date: e.target.value
                              ? dateInputToIso(e.target.value)
                              : null,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-cb-border bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-cb-terracotta-dark">📝 ملاحظات وشروط</h3>
                  <textarea
                    className={cn(fieldClass, "mt-3 min-h-20 resize-y")}
                    placeholder="ملاحظة للعميل"
                    value={doc.notes ?? ""}
                    onChange={(e) => setDoc((d) => ({ ...d, notes: e.target.value }))}
                  />
                  <textarea
                    className={cn(fieldClass, "mt-2 min-h-20 resize-y")}
                    placeholder="الشروط والأحكام"
                    value={doc.terms ?? ""}
                    onChange={(e) => setDoc((d) => ({ ...d, terms: e.target.value }))}
                  />
                </div>
              </section>
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-cb-border bg-white/95 px-5 py-3">
              <button
                type="button"
                className="text-sm font-semibold text-cb-text-muted hover:text-cb-text-strong"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={saving}
                className={buttonClassName("primary", "min-w-[10rem] gap-2 px-5 py-2.5")}
                onClick={() => void submit()}
              >
                {saving ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {saving ? "جاري الحفظ…" : isEdit ? "حفظ التعديلات" : "حفظ الفاتورة"}
              </button>
            </footer>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
