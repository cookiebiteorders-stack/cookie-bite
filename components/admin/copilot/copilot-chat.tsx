"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { Send, Loader2, Wrench, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { MrsCookieAvatar } from "@/components/admin/copilot/mrs-cookie-avatar";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: { name: string; ms: number }[];
  error?: boolean;
};

type CopilotChatProps = {
  /**
   * Fills the parent flex column (use inside drawer or full-page shell).
   * Parent must be `flex flex-col min-h-0` with a defined height.
   */
  fillParent?: boolean;
  /**
   * Hides the in-chat header (drawer / full-page already show Mrs. Cookie above).
   */
  hideHeader?: boolean;
  greeting?: string;
};

const SUGGESTIONS_EN = [
  "How is today going?",
  "Show me pending orders from the last 48 hours.",
  "Which products are below 5 in stock?",
  "Top 5 bestsellers this month.",
  "Sales report for the last 30 days.",
  "Find the customer with email ahmed@example.com",
];

const SUGGESTIONS_AR = [
  "كيف يسير يومنا حتى الآن؟",
  "اعرض الطلبات المعلّقة في آخر 48 ساعة.",
  "ما المنتجات التي مخزونها أقل من 5؟",
  "أفضل 5 منتجات مبيعاً هذا الشهر.",
  "تقرير المبيعات لآخر 30 يوماً.",
  "ابحث عن العميل بالبريد ahmed@example.com",
];

export function CopilotChat({
  fillParent = false,
  hideHeader = false,
  greeting,
}: CopilotChatProps) {
  const { lang, t } = useLanguage();
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      const next: ChatMessage = { role: "user", content: trimmed };
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev, next]);
      setInput("");
      setBusy(true);

      try {
        const res = await fetch("/api/admin/copilot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history,
            currentPath: pathname || "/admin",
            language: lang,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          const msg =
            (data?.error && (lang === "ar" ? data.error.ar : data.error.en)) ||
            data?.message ||
            t("copilot.errorGeneric");
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: msg, error: true },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.reply || "—",
              toolCalls: Array.isArray(data.toolCalls)
                ? data.toolCalls.map((c: { name: string; ms: number }) => ({
                    name: c.name,
                    ms: c.ms,
                  }))
                : undefined,
            },
          ]);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: err instanceof Error ? err.message : t("copilot.errorGeneric"),
            error: true,
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, lang, messages, pathname, t],
  );

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void send(input);
  };

  const suggestions = lang === "ar" ? SUGGESTIONS_AR : SUGGESTIONS_EN;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        fillParent
          ? "h-full flex-1"
          : "h-[min(560px,70dvh)] rounded-2xl border border-cb-border bg-cb-surface shadow-sm",
      )}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      {!hideHeader && (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cb-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <MrsCookieAvatar size={36} />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-cb-text-strong">
                {t("copilot.title")}
              </span>
              <span className="text-[11px] text-cb-text-soft">
                {t("copilot.subtitle")}
              </span>
            </div>
          </div>
          {busy && (
            <span className="flex items-center gap-1.5 text-xs text-cb-text-soft">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {t("copilot.thinking")}
            </span>
          )}
        </header>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col justify-center gap-4 py-2">
            <div className="rounded-2xl border border-dashed border-cb-border-strong bg-cb-peach/30 p-4 text-center sm:p-5">
              <MrsCookieAvatar size={72} className="mx-auto sm:hidden" />
              <MrsCookieAvatar size={84} className="mx-auto hidden sm:block" />
              <p className="mt-3 text-sm font-semibold text-cb-text-strong">
                {greeting ?? t("copilot.greeting")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-cb-text-soft">
                {t("copilot.greetingSub")}
              </p>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-cb-text-soft">
                {t("copilot.trySomething")}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    disabled={busy}
                    className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2.5 text-start text-xs leading-snug text-cb-text-strong transition hover:border-cb-brand-logo hover:bg-cb-peach/40 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ul className="space-y-3 sm:space-y-4">
            {messages.map((m, i) => (
              <li
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[85%] sm:px-4 sm:py-3",
                    m.role === "user"
                      ? "bg-cb-brand-logo text-white"
                      : m.error
                        ? "border border-red-200 bg-red-50 text-red-900"
                        : "border border-cb-border bg-cb-surface-2 text-cb-text-strong",
                  )}
                >
                  {m.error ? (
                    <div className="flex gap-2">
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden
                      />
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-cb-border/60 pt-2.5">
                      {m.toolCalls.map((c, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-full bg-cb-peach/40 px-2 py-0.5 text-[10px] font-semibold text-cb-text"
                          title={`${c.ms}ms`}
                        >
                          <Wrench className="h-2.5 w-2.5" aria-hidden />
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
            {busy && (
              <li className="flex justify-start">
                <div className="rounded-2xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-soft">
                  <Loader2 className="inline h-3.5 w-3.5 animate-spin" aria-hidden />{" "}
                  {t("copilot.thinking")}…
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex shrink-0 items-end gap-2 border-t border-cb-border bg-cb-surface-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          placeholder={t("copilot.inputPlaceholder")}
          disabled={busy}
          className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-cb-border bg-cb-surface px-3 py-2.5 text-sm text-cb-text-strong placeholder:text-cb-text-soft focus:border-cb-brand-logo focus:outline-none focus:ring-2 focus:ring-cb-brand-logo/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="inline-flex h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-cb-brand-logo px-3 text-sm font-semibold text-white transition hover:bg-cb-brand-logo-dark disabled:opacity-40 sm:px-4"
          aria-label={t("copilot.send")}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          <span className="hidden sm:inline">{t("copilot.send")}</span>
        </button>
      </form>
    </div>
  );
}
