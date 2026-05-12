"use client";

import { useCallback, useRef, useState } from "react";
import { ClipboardCopy, MessageCircle, Send, Sparkles, Trash2, Wand2 } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";
import {
  resetWizard,
  type ProductMarketingPreviewJson,
  type ProductWizardState,
} from "@/lib/admin/product-assistant/wizard";
import { useProductsDashboardStore } from "@/stores/products-dashboard-store";

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ProductAssistantPanel({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [wizard, setWizard] = useState<ProductWizardState>(resetWizard());
  const [compiledPayload, setCompiledPayload] = useState<Record<string, unknown> | null>(
    null,
  );
  const [marketingPreview, setMarketingPreview] = useState<ProductMarketingPreviewJson | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const createProduct = useProductsDashboardStore((s) => s.createProduct);
  const pushToast = useProductsDashboardStore((s) => s.pushToast);

  const scrollEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !canWrite) return;
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { id: id(), role: "user", content: text }]);
    scrollEnd();
    try {
      const res = await fetchJson<{
        reply: string;
        wizard: ProductWizardState;
        compiledPayload: Record<string, unknown> | null;
        marketingPreview: ProductMarketingPreviewJson | null;
      }>("/api/admin/product-assistant/chat", {
        method: "POST",
        jsonBody: { message: text, wizard },
      });
      setWizard(res.wizard);
      setCompiledPayload(res.compiledPayload ?? null);
      setMarketingPreview(res.marketingPreview ?? null);
      setMessages((m) => [...m, { id: id(), role: "assistant", content: res.reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل الطلب";
      setMessages((m) => [...m, { id: id(), role: "assistant", content: msg }]);
      pushToast(msg, "error");
    } finally {
      setSending(false);
      scrollEnd();
    }
  }, [input, sending, canWrite, wizard, scrollEnd, pushToast]);

  const onCreateInCatalog = useCallback(async () => {
    if (!compiledPayload || creating || !canWrite) return;
    setCreating(true);
    try {
      const row = await createProduct(compiledPayload);
      if (row) {
        setCompiledPayload(null);
        setMarketingPreview(null);
        setWizard(resetWizard());
        setMessages([
          {
            id: id(),
            role: "assistant",
            content: `تم إنشاء المنتج في الكتالوج (المعرّف: ${row.id}). يمكنك البدء من جديد بكتابة «أضف منتجاً».`,
          },
        ]);
      }
    } finally {
      setCreating(false);
    }
  }, [compiledPayload, creating, canWrite, createProduct]);

  const onReset = useCallback(() => {
    setWizard(resetWizard());
    setCompiledPayload(null);
    setMarketingPreview(null);
    setMessages([]);
    setInput("");
  }, []);

  const copyPreviewJson = useCallback(async () => {
    if (!marketingPreview) return;
    const text = JSON.stringify(marketingPreview, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      pushToast("تم نسخ JSON المعاينة.", "success");
    } catch {
      pushToast("تعذّر النسخ من المتصفح.", "error");
    }
  }, [marketingPreview, pushToast]);

  return (
    <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-start transition hover:bg-amber-50/80 dark:hover:bg-amber-950/20"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-cb-text-strong">
          <Wand2 className="h-4 w-4 text-amber-600" aria-hidden />
          مساعد إنشاء المنتج (محادثة)
        </span>
        <span className="text-xs font-semibold text-cb-text-muted">
          {open ? "إخفاء" : "إظهار"}
        </span>
      </button>

      {open ? (
        <div className="border-t border-cb-border px-3 pb-3 pt-1">
          <p className="px-1 pb-2 text-xs leading-relaxed text-cb-text-muted">
            اكتب «أضف منتجاً» أو <span className="font-mono">add product</span> للبدء، ثم أجب
            خطوة بخطوة. العملة في الكتالوج هي <strong className="text-cb-text-strong">ج.م</strong>
            .
          </p>

          <div
            ref={listRef}
            className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-cb-border bg-cb-surface-2 p-2"
          >
            {messages.length === 0 ? (
              <p className="flex items-center gap-2 px-2 py-6 text-center text-xs text-cb-text-muted">
                <MessageCircle className="mx-auto h-8 w-8 opacity-40" aria-hidden />
                لا رسائل بعد — ابدأ بعبارة إنشاء منتج.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-lg px-2.5 py-2 text-xs leading-relaxed",
                    m.role === "user"
                      ? "ms-6 bg-amber-100/90 text-stone-900 dark:bg-amber-950/40 dark:text-amber-50"
                      : "me-6 bg-white text-stone-800 dark:bg-stone-900 dark:text-stone-100",
                  )}
                >
                  {m.content}
                </div>
              ))
            )}
          </div>

          {marketingPreview ? (
            <div className="mt-2 rounded-xl border border-cb-border bg-cb-surface-2">
              <button
                type="button"
                onClick={() => setPreviewOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-xs font-bold text-cb-text-strong"
              >
                معاينة JSON (تسويق / SEO — ج.م)
                <span className="font-normal text-cb-text-muted">{previewOpen ? "▼" : "◀"}</span>
              </button>
              {previewOpen ? (
                <div className="border-t border-cb-border p-2">
                  <div className="mb-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void copyPreviewJson()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cb-border bg-white px-2 py-1 text-[11px] font-semibold text-cb-text-strong hover:bg-amber-50 dark:bg-stone-900 dark:hover:bg-amber-950/30"
                    >
                      <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                      نسخ JSON
                    </button>
                  </div>
                  <pre
                    dir="ltr"
                    className="max-h-48 overflow-auto rounded-lg bg-stone-950 p-2 text-left text-[10px] leading-relaxed text-amber-50/95"
                  >
                    {JSON.stringify(marketingPreview, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}

          {compiledPayload ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canWrite || creating}
                onClick={() => void onCreateInCatalog()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-amber-700 disabled:opacity-50 min-[420px]:flex-none"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {creating ? "جاري الإنشاء…" : "إنشاء في الكتالوج"}
              </button>
            </div>
          ) : null}

          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={!canWrite || sending}
              placeholder={canWrite ? "رسالتك…" : "صلاحية القراءة فقط"}
              className="min-w-0 flex-1 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs dark:bg-stone-950"
            />
            <button
              type="button"
              disabled={!canWrite || sending || !input.trim()}
              onClick={() => void send()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-stone-900 px-3 py-2 text-white dark:bg-amber-600 disabled:opacity-40"
              aria-label="إرسال"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-cb-border px-2 py-2 text-cb-text-muted hover:bg-cb-surface-2"
              aria-label="مسح المحادثة"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
