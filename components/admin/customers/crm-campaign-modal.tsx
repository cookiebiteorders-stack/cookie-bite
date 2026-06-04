"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Mail, X } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";

type Template = {
  key: string;
  name: string;
  category: string;
  source: "library" | "db";
};

type Props = {
  open: boolean;
  onClose: () => void;
  recipientEmails: string[];
  canWrite: boolean;
  onSent?: () => void;
};

export function CrmCampaignModal({ open, onClose, recipientEmails, canWrite, onSent }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [templateKey, setTemplateKey] = useState("");
  const [source, setSource] = useState<"library" | "db">("library");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [scope, setScope] = useState<"page" | "all">("page");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingTpl(true);
    setError(null);
    setResult(null);
    void (async () => {
      try {
        const res = await fetchJson<{ templates: Template[] }>(
          "/api/admin/customers/campaign/templates",
          { cache: "no-store" },
        );
        if (!cancelled) {
          setTemplates(res.templates ?? []);
          const first = res.templates?.[0];
          if (first) {
            setTemplateKey(first.key);
            setSource(first.source);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "تعذّر تحميل القوالب");
      } finally {
        if (!cancelled) setLoadingTpl(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selected = templates.find((t) => t.key === templateKey && t.source === source);

  const onTemplateChange = (value: string) => {
    const [src, key] = value.split("::");
    setSource(src === "db" ? "db" : "library");
    setTemplateKey(key ?? "");
  };

  const submit = async () => {
    if (!canWrite) {
      setError("صلاحية الكتابة مطلوبة.");
      return;
    }
    if (!templateKey) {
      setError("اختر قالباً.");
      return;
    }
    const emails =
      scope === "page"
        ? [...new Set(recipientEmails.map((e) => e.toLowerCase()).filter(Boolean))]
        : undefined;
    if (scope === "page" && !emails?.length) {
      setError("لا يوجد عملاء في الصفحة الحالية.");
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetchJson<{
        sent: number;
        failed: number;
        total: number;
        message?: { ar?: string };
      }>("/api/admin/customers/campaign", {
        method: "POST",
        jsonBody: {
          templateKey,
          source,
          lang,
          scope,
          emails,
          vars: { first_name: "عميلنا" },
        },
      });
      setResult(res.message?.ar ?? `تم الإرسال: ${res.sent} / ${res.total}`);
      onSent?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل إرسال الحملة");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="crm-campaign-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="admin-panel-surface relative w-full max-w-lg rounded-2xl border border-cb-border p-6 shadow-2xl"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="crm-campaign-title" className="font-serif text-lg font-bold text-stone-950">
                  إرسال حملة بريدية
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  من قوالب الموقع (مكتبة الإشعارات أو قوالب البريد النشطة).
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-stone-600 hover:bg-stone-100"
                onClick={onClose}
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-stone-800">
                القالب
                <select
                  className="mt-1 w-full rounded-xl border border-cb-border bg-white px-3 py-2.5 text-sm"
                  value={selected ? `${source}::${templateKey}` : ""}
                  disabled={loadingTpl}
                  onChange={(e) => onTemplateChange(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={`${t.source}::${t.key}`} value={`${t.source}::${t.key}`}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-stone-800">
                  اللغة
                  <select
                    className="mt-1 w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm"
                    value={lang}
                    onChange={(e) => setLang(e.target.value as "ar" | "en")}
                  >
                    <option value="ar">عربي</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-stone-800">
                  المستلمون
                  <select
                    className="mt-1 w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm"
                    value={scope}
                    onChange={(e) => setScope(e.target.value as "page" | "all")}
                  >
                    <option value="page">الصفحة الحالية ({recipientEmails.length})</option>
                    <option value="all">أحدث 80 عميلاً</option>
                  </select>
                </label>
              </div>

              {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
              {result ? <p className="text-sm font-medium text-emerald-800">{result}</p> : null}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" className="admin-btn-secondary rounded-xl px-4 py-2 text-sm font-bold" onClick={onClose}>
                إلغاء
              </button>
              <button
                type="button"
                disabled={busy || loadingTpl || !canWrite}
                className={cn(
                  "admin-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold",
                  (busy || !canWrite) && "opacity-60",
                )}
                onClick={() => void submit()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                إرسال
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
