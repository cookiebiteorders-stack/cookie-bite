"use client";

import { useCallback, useEffect, useState } from "react";
import type { CopilotPromptConfig } from "@/lib/admin/copilot/copilot-prompt-config";

export function CopilotPromptEditor() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [overlay, setOverlay] = useState("");
  const [published, setPublished] = useState(false);
  const [meta, setMeta] = useState<CopilotPromptConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/copilot/prompt", {
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => null);
      const config: CopilotPromptConfig | undefined = json?.config;
      if (config) {
        setOverlay(config.overlay);
        setPublished(config.is_published);
        setMeta(config);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && meta === null) void load();
  }, [open, meta, load]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/copilot/prompt", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overlay, is_published: published }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(json?.error?.ar ?? "تعذر الحفظ");
        return;
      }
      setMeta(json.config ?? null);
      setMessage("تم الحفظ بنجاح");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-cb-border bg-cb-surface p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-start"
      >
        <span>
          <span className="font-semibold text-cb-text-strong">
            تخصيص شخصية Mrs. Cookie (Overlay)
          </span>
          <span className="ms-2 text-xs text-cb-text-muted">
            للأونرز والأدمن فقط — يُضاف فوق التعليمات الأساسية
          </span>
        </span>
        <span className="text-cb-text-muted">{open ? "▾" : "▸"}</span>
      </button>

      {open ? (
        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-cb-text-muted">جاري التحميل…</p>
          ) : (
            <>
              <p className="text-xs text-cb-text-muted">
                نص إضافي يوجّه أسلوب وأولويات Mrs. Cookie (مثل لهجة، تركيز على مهام
                معيّنة). لا يُطبَّق إلا عند تفعيل «منشور».
              </p>
              <textarea
                className="min-h-[180px] w-full rounded-xl border border-cb-border bg-white p-4 font-mono text-sm leading-relaxed"
                value={overlay}
                placeholder="مثال: ركّزي على تنبيهات المخزون المنخفض أولاً، واستخدمي لهجة مصرية ودودة."
                onChange={(e) => setOverlay(e.target.value)}
                maxLength={8000}
              />
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                  />
                  منشور (يُستخدم فعلياً)
                </label>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="rounded-xl bg-[#5c3317] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ…" : "حفظ"}
                </button>
                {meta?.updated_at ? (
                  <span className="text-xs text-cb-text-muted">
                    آخر تحديث: {new Date(meta.updated_at).toLocaleString("ar-EG")}
                  </span>
                ) : null}
                {message ? (
                  <span className="text-sm text-green-700">{message}</span>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
