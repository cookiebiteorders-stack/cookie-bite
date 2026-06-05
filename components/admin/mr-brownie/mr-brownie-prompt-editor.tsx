"use client";

import { useCallback, useEffect, useState } from "react";
import type { PersonaPromptRow } from "@/lib/mr-brownie/persona-prompts";

export function MrBrowniePromptEditor() {
  const [prompts, setPrompts] = useState<PersonaPromptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedKey, setSelectedKey] = useState("mr_brownie:any:a");
  const [draft, setDraft] = useState("");
  const [published, setPublished] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/mr-brownie/prompts", { credentials: "same-origin" });
      const json = await res.json();
      setPrompts(json.prompts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = prompts.find(
    (p) => `${p.persona}:${p.locale}:${p.variant}` === selectedKey,
  );

  useEffect(() => {
    if (selected) {
      setDraft(selected.instruction);
      setPublished(selected.is_published);
    }
  }, [selected]);

  const reindexKnowledge = async () => {
    setReindexing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/mr-brownie/knowledge/reindex", {
        method: "POST",
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(json?.error?.ar ?? "تعذر إعادة الفهرسة");
        return;
      }
      setMessage(
        `تم فهرسة ${json.indexed ?? 0} مقطع (منها ${json.products ?? 0} منتج)`,
      );
    } finally {
      setReindexing(false);
    }
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/mr-brownie/prompts", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: selected.persona,
          locale: selected.locale,
          variant: selected.variant,
          instruction: draft,
          is_published: published,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json?.error?.ar ?? "تعذر الحفظ");
        return;
      }
      setPrompts(json.prompts ?? []);
      setMessage("تم الحفظ بنجاح");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-cb-text-muted">جاري تحميل البرومبتات…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-cb-text-muted">
        عدّل تعليمات Mr. Brownie للمتجر — مع اختبار A/B (variant A مقابل B). يُعيَّن كل
        زائر لـ variant ثابت تلقائياً. Mrs. Cookie (الأدمن) لها برومبت منفصل في{" "}
        <code className="rounded bg-cb-surface-2 px-1">/admin/copilot</code>.
      </p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => {
          const key = `${p.persona}:${p.locale}:${p.variant}`;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedKey(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                selectedKey === key
                  ? "bg-[#5c3317] text-white"
                  : "border border-cb-border bg-white text-cb-text-strong"
              }`}
            >
              {p.locale} · variant {p.variant.toUpperCase()}
              {p.is_published ? " ✓" : ""}
            </button>
          );
        })}
      </div>
      <textarea
        className="min-h-[280px] w-full rounded-xl border border-cb-border bg-white p-4 font-mono text-sm leading-relaxed"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          منشور (يُستخدم في المحادثات)
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-xl bg-[#5c3317] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "جاري الحفظ…" : "حفظ"}
        </button>
        <button
          type="button"
          disabled={reindexing}
          onClick={() => void reindexKnowledge()}
          className="rounded-xl border border-cb-border bg-white px-4 py-2 text-sm font-semibold text-cb-text-strong disabled:opacity-50"
        >
          {reindexing ? "جاري الفهرسة…" : "إعادة فهرسة RAG (pgvector)"}
        </button>
        {selected?.version ? (
          <span className="text-xs text-cb-text-muted">إصدار {selected.version}</span>
        ) : null}
        {message ? <span className="text-sm text-green-700">{message}</span> : null}
      </div>
    </div>
  );
}
