"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Layout,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { PrintActions } from "@/components/print/print-actions";

type TemplateCategory =
  | "transactional"
  | "lifecycle"
  | "security"
  | "marketing"
  | "retention"
  | "internal-report"
  | "business-report"
  | "dashboard";

type TemplateVariant = "email" | "report" | "dash";

type TemplateMeta = {
  key: string;
  name: string;
  description: string;
  category: TemplateCategory;
  variant: TemplateVariant;
  sampleVars: Record<string, string | number>;
};

type Group = {
  category: TemplateCategory;
  label: string;
  items: TemplateMeta[];
};

const VARIANT_LABEL: Record<TemplateVariant, string> = {
  email: "Email",
  report: "Printable",
  dash: "Dashboard",
};

const VARIANT_FRAME: Record<TemplateVariant, string> = {
  email: "min-h-[820px]",
  report: "min-h-[1180px]",
  dash: "min-h-[900px]",
};

type ToastState = { kind: "success" | "error"; text: string } | null;

export default function TemplateLibraryPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [lang, setLang] = useState<"en" | "ar">("en");

  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const [testEmail, setTestEmail] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingList(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/template-library", {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Failed (${res.status})`);
        }
        const data = (await res.json()) as { groups: Group[] };
        if (cancelled) return;
        setGroups(data.groups);
        const first = data.groups[0]?.items[0];
        if (first && !selectedKey) {
          setSelectedKey(first.key);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedKey]);

  const selectedMeta = useMemo(() => {
    if (!selectedKey) return null;
    for (const g of groups) {
      const found = g.items.find((it) => it.key === selectedKey);
      if (found) return found;
    }
    return null;
  }, [groups, selectedKey]);

  const loadPreview = useCallback(
    async (key: string, language: "en" | "ar") => {
      setPreviewLoading(true);
      setPreviewHtml("");
      setPreviewSubject("");
      try {
        const res = await fetch(
          `/api/admin/template-library?key=${encodeURIComponent(key)}&lang=${language}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: { en?: string };
          } | null;
          throw new Error(err?.error?.en ?? `Failed (${res.status})`);
        }
        const data = (await res.json()) as { html: string; subject: string };
        setPreviewHtml(data.html);
        setPreviewSubject(data.subject);
      } catch (e) {
        setToast({
          kind: "error",
          text: e instanceof Error ? e.message : "Preview failed",
        });
      } finally {
        setPreviewLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedKey) return;
    queueMicrotask(() => {
      void loadPreview(selectedKey, lang);
    });
  }, [selectedKey, lang, loadPreview]);

  const filteredGroups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) =>
            it.name.toLowerCase().includes(q) ||
            it.key.toLowerCase().includes(q) ||
            it.description.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [filter, groups]);

  const handleSendTest = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedKey) return;
    if (!testEmail) {
      setToast({ kind: "error", text: "Please enter a recipient email" });
      return;
    }
    setSending(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/template-library/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selectedKey,
          to: testEmail,
          lang,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: { en?: string } }
        | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error?.en ?? `Failed (${res.status})`);
      }
      setToast({ kind: "success", text: `Sent test email to ${testEmail}` });
    } catch (e) {
      setToast({
        kind: "error",
        text: e instanceof Error ? e.message : "Send failed",
      });
    } finally {
      setSending(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleCopyHtml = async () => {
    if (!previewHtml) return;
    try {
      await navigator.clipboard.writeText(previewHtml);
      setToast({ kind: "success", text: "HTML copied to clipboard" });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ kind: "error", text: "Copy failed" });
    }
  };

  const variant = selectedMeta?.variant ?? "email";

  return (
    <section className="space-y-6 pb-10">
      <header className="admin-panel-surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="admin-panel-scrim" aria-hidden />
        <div className="pointer-events-none absolute -right-16 -top-12 h-48 w-48 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 dark:border-amber-800 dark:bg-stone-900/70 dark:text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              Notification Library
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
              Template Library & Designer
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-700 sm:text-base">
              مكتبة موحّدة لكل قوالب البريد والتقارير والتنبيهات. عاين كل قالب
              مع بيانات تجريبية، أرسل اختبار، وانسخ الـHTML الجاهز لإرساله من أي
              مكان.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cb-border bg-white/90 px-3 py-1.5 text-xs font-semibold text-stone-900 dark:bg-stone-900/80 dark:text-stone-100">
              <Mail className="h-3.5 w-3.5" />
              Resend ready
            </span>
            <button
              type="button"
              onClick={() => selectedKey && void loadPreview(selectedKey, lang)}
              className="inline-flex items-center gap-1.5 rounded-full border border-cb-border bg-white/90 px-3 py-1.5 text-xs font-semibold text-stone-900 hover:bg-stone-100 dark:bg-stone-900/80 dark:text-stone-100 dark:hover:bg-stone-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {toast ? (
        <div
          role="status"
          className={`rounded-2xl border p-3 text-sm font-semibold ${
            toast.kind === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
              : "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {toast.kind === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {toast.text}
          </span>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/70">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search templates..."
              className="w-full rounded-xl border border-cb-border bg-white py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:bg-stone-950/40 dark:text-stone-100"
            />
          </div>

          {loadingList ? (
            <p className="px-2 py-4 text-sm text-stone-600 dark:text-stone-400">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Loading library…
            </p>
          ) : error ? (
            <p className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-100">
              {error}
            </p>
          ) : (
            <div className="space-y-4 pt-1">
              {filteredGroups.map((g) => (
                <div key={g.category}>
                  <p className="px-2 text-[11px] font-bold uppercase tracking-wide text-stone-600 dark:text-stone-400">
                    {g.label}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {g.items.map((it) => {
                      const active = selectedKey === it.key;
                      return (
                        <li key={it.key}>
                          <button
                            type="button"
                            onClick={() => setSelectedKey(it.key)}
                            className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left transition ${
                              active
                                ? "border-amber-400 bg-amber-50 text-stone-950 dark:border-amber-500/60 dark:bg-amber-900/30 dark:text-stone-100"
                                : "border-transparent bg-stone-50/80 hover:border-cb-border hover:bg-stone-100 dark:bg-stone-950/30 dark:hover:bg-stone-900/60"
                            }`}
                          >
                            <Layout className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700 dark:text-amber-300" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                                {it.name}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-stone-600 dark:text-stone-400">
                                {it.description}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {filteredGroups.length === 0 ? (
                <p className="px-2 py-4 text-sm text-stone-600 dark:text-stone-400">
                  No templates match “{filter}”.
                </p>
              ) : null}
            </div>
          )}
        </aside>

        <main className="space-y-4">
          {selectedMeta ? (
            <>
              <div className="flex flex-col gap-3 rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/70 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    {selectedMeta.category.replace(/-/g, " ")} ·{" "}
                    {VARIANT_LABEL[selectedMeta.variant]}
                  </p>
                  <h2 className="mt-1 truncate font-serif text-xl font-bold text-stone-950 dark:text-white">
                    {selectedMeta.name}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-700 dark:text-stone-300">
                    {selectedMeta.description}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex overflow-hidden rounded-xl border border-cb-border bg-stone-100 text-xs font-semibold dark:bg-stone-950/40">
                    {(["en", "ar"] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLang(l)}
                        className={`px-3 py-1.5 transition ${
                          lang === l
                            ? "bg-stone-900 text-white"
                            : "text-stone-700 hover:bg-stone-200 dark:text-stone-200 dark:hover:bg-stone-800"
                        }`}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyHtml}
                    disabled={!previewHtml}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cb-border bg-white px-3 py-1.5 text-xs font-semibold text-stone-900 hover:bg-stone-100 disabled:opacity-50 dark:bg-stone-950/40 dark:text-stone-100 dark:hover:bg-stone-900"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy HTML
                  </button>
                  {previewHtml ? (
                    <PrintActions
                      html={previewHtml}
                      title={previewSubject || selectedMeta.name}
                      size="sm"
                      onPrintBlocked={() =>
                        setToast({
                          kind: "error",
                          text: "Allow pop-ups to print this template with full design.",
                        })
                      }
                    />
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/70">
                <form
                  onSubmit={handleSendTest}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <label className="flex-1">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-stone-600 dark:text-stone-400">
                      Send test to
                    </span>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:bg-stone-950/40 dark:text-stone-100"
                    />
                  </label>
                  <div className="flex-[2]">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-stone-600 dark:text-stone-400">
                      Subject preview
                    </span>
                    <p className="mt-1 truncate rounded-xl border border-cb-border bg-stone-50 px-3 py-2 text-sm text-stone-800 dark:bg-stone-950/30 dark:text-stone-100">
                      {previewSubject || "—"}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !testEmail || !selectedKey}
                    className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send test
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-cb-border bg-stone-200/40 p-3 dark:bg-stone-950/30">
                {previewLoading ? (
                  <div className="flex h-72 items-center justify-center text-sm text-stone-600 dark:text-stone-400">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rendering preview…
                  </div>
                ) : previewHtml ? (
                  <iframe
                    key={`${selectedKey}-${lang}`}
                    title={`${selectedMeta.name} preview`}
                    srcDoc={previewHtml}
                    className={`w-full rounded-xl border border-cb-border bg-white ${VARIANT_FRAME[variant]}`}
                  />
                ) : (
                  <p className="px-3 py-6 text-sm text-stone-600 dark:text-stone-400">
                    No preview available.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-cb-border bg-white/90 p-10 text-center dark:bg-stone-900/70">
              <Layout className="mx-auto h-8 w-8 text-stone-400" />
              <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
                Pick a template from the left to preview it.
              </p>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
