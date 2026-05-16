"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { InvoiceView } from "@/components/invoices/invoice-view";
import {
  toInvoiceViewModel,
  type RawInvoice,
} from "@/lib/invoices/to-invoice-view-model";

type ApiResponse = {
  invoice?: RawInvoice;
  error?: { en?: string; ar?: string };
};

export default function PublicInvoicePage() {
  const params = useParams<{ invoiceNumber: string }>();
  const invoiceNumber = decodeURIComponent(String(params?.invoiceNumber ?? ""));
  const [raw, setRaw] = useState<RawInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceNumber) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/invoices/${encodeURIComponent(invoiceNumber)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok) {
          throw new Error(json.error?.en ?? `Request failed (${res.status})`);
        }
        if (!json.invoice) throw new Error("Invoice not found");
        setRaw(json.invoice);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Failed to load invoice";
        setError(message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [invoiceNumber]);

  const viewModel = useMemo(
    () => (raw ? toInvoiceViewModel(raw) : null),
    [raw],
  );

  return (
    <main
      className="min-h-dvh bg-[#f0ede6] px-3 py-8 text-stone-900 sm:px-5 sm:py-10 dark:bg-stone-950 dark:text-stone-100"
      dir="ltr"
    >
      <div className="mx-auto max-w-[820px] space-y-4">
        <div className="flex items-center justify-between gap-2 print:hidden">
          <Link
            href="/account#orders"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800/60"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to my orders
          </Link>
          <p className="font-mono text-xs text-stone-500 dark:text-stone-400">
            {invoiceNumber}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-stone-300 bg-white p-10 text-center text-sm text-stone-600 shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-stone-500" />
            Loading invoice…
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-900 shadow-sm dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
            <p className="font-bold">Could not load invoice</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : null}

        {!loading && !error && viewModel ? <InvoiceView invoice={viewModel} /> : null}
      </div>
    </main>
  );
}
