"use client";

import { useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";

type ParsedLine = {
  recipient: string;
  phone: string;
  address: string;
  notes?: string;
};

function parseBulkLines(text: string): ParsedLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: ParsedLine[] = [];
  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length >= 3) {
      out.push({
        recipient: parts[0],
        phone: parts[1],
        address: parts[2],
        notes: parts[3],
      });
    }
  }
  return out;
}

export function CorporateBulkAddressesForm() {
  const { t, lang } = useLanguage();
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; text: string }>(null);

  const preview = parseBulkLines(bulkText);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const addresses = parseBulkLines(bulkText);
    if (!company.trim() || !email.trim() || addresses.length === 0) {
      setResult({ ok: false, text: t("pages.corporateGifting.bulk.invalid") });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/corporate/bulk-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: company.trim(),
          contact_name: contactName.trim() || undefined,
          contact_email: email.trim(),
          contact_phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
          addresses,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message_ar?: string;
        message_en?: string;
        error?: { ar?: string; en?: string };
      } | null;
      if (!res.ok) {
        const msg =
          lang === "ar"
            ? data?.error?.ar ?? t("pages.corporateGifting.bulk.error")
            : data?.error?.en ?? t("pages.corporateGifting.bulk.error");
        setResult({ ok: false, text: msg });
        return;
      }
      const msg =
        lang === "ar"
          ? (data?.message_ar ?? t("pages.corporateGifting.bulk.success"))
          : (data?.message_en ?? t("pages.corporateGifting.bulk.success"));
      setResult({ ok: true, text: msg });
      setBulkText("");
    } catch {
      setResult({ ok: false, text: t("pages.corporateGifting.bulk.error") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 rounded-3xl border border-cb-border bg-cb-surface p-6 shadow-sm">
      <h2 className="font-serif text-xl font-semibold text-cb-text-strong">
        {t("pages.corporateGifting.bulk.title")}
      </h2>
      <p className="mt-2 text-sm text-cb-text">{t("pages.corporateGifting.bulk.hint")}</p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-cb-text-strong">
              {t("pages.corporateGifting.bulk.company")}
            </span>
            <input
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-cb-text-strong">
              {t("pages.corporateGifting.bulk.contactName")}
            </span>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-cb-text-strong">
              {t("pages.corporateGifting.bulk.email")}
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-cb-text-strong">
              {t("pages.corporateGifting.bulk.phone")}
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-cb-text-strong">
            {t("pages.corporateGifting.bulk.addressesLabel")}
          </span>
          <textarea
            required
            rows={8}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={t("pages.corporateGifting.bulk.placeholder")}
            className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2 font-mono text-xs"
          />
        </label>

        {preview.length > 0 ? (
          <p className="text-xs font-medium text-emerald-800">
            {t("pages.corporateGifting.bulk.preview", { count: String(preview.length) })}
          </p>
        ) : null}

        <label className="block text-sm">
          <span className="font-medium text-cb-text-strong">
            {t("pages.corporateGifting.bulk.notes")}
          </span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className={buttonClassName("primary", "rounded-full px-8 disabled:opacity-60")}
        >
          {busy ? "…" : t("pages.corporateGifting.bulk.submit")}
        </button>

        {result ? (
          <p
            role="status"
            className={result.ok ? "text-sm text-emerald-800" : "text-sm text-red-800"}
          >
            {result.text}
          </p>
        ) : null}
      </form>
    </section>
  );
}
