"use client";

import { useState, useRef, useEffect, useCallback, useMemo, type FormEvent } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Send, Loader2, Wrench, AlertTriangle, Zap, CheckCircle2 } from "lucide-react";
import {
  ChatImageAttachButton,
  ChatImagePreviewStrip,
  clearPendingAttachments,
  hasUploadingAttachments,
  readyAttachments,
  type PendingChatImage,
} from "@/components/chat/chat-image-attachment-input";
import { useLanguage } from "@/components/providers/language-provider";
import { MrsCookieAvatar } from "@/components/admin/copilot/mrs-cookie-avatar";
import { copilotSuggestionsForPath } from "@/lib/admin/copilot/quick-suggestions";
import { dispatchCopilotRefresh, moduleFromCopilotTool } from "@/lib/admin/copilot/copilot-events";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  imageUrls?: string[];
  toolCalls?: { name: string; ms: number }[];
  actions?: Array<{ tool: string; action?: string; ok?: boolean }>;
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
  "Add a luxury dark chocolate cookie product",
  "Change a product price to 250 EGP",
  "Show pending orders from the last 48 hours",
  "Create 20% off for one week",
  "How is today going?",
];

const SUGGESTIONS_AR = [
  "ضيف منتج كوكيز شوكولاتة فاخر",
  "غيّر سعر منتج لـ 250 جنيه",
  "اعرض الطلبات المعلّقة في آخر 48 ساعة",
  "اعمل خصم 20% لمدة أسبوع",
  "كيف يسير يومنا حتى الآن؟",
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
  const [pendingImages, setPendingImages] = useState<PendingChatImage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      const attachments = readyAttachments(pendingImages);
      if ((!trimmed && attachments.length === 0) || busy) return;
      if (hasUploadingAttachments(pendingImages)) return;

      const imageUrls = attachments.map((a) => a.url);
      const next: ChatMessage = {
        role: "user",
        content: trimmed || (lang === "ar" ? "انظر الصورة المرفقة" : "See attached image"),
        imageUrls: imageUrls.length ? imageUrls : undefined,
      };
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.imageUrls?.map((url) => ({ url })),
      }));
      setMessages((prev) => [...prev, next]);
      setInput("");
      clearPendingAttachments(pendingImages);
      setPendingImages([]);
      setBusy(true);

      try {
        const res = await fetch("/api/admin/copilot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: next.content,
            attachments: attachments.length ? attachments : undefined,
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
          const toolCalls = Array.isArray(data.toolCalls)
            ? data.toolCalls.map((c: { name: string; ms: number }) => ({
                name: c.name,
                ms: c.ms,
              }))
            : undefined;
          const actions = Array.isArray(data.actions) ? data.actions : undefined;

          for (const tc of toolCalls ?? []) {
            const mod = moduleFromCopilotTool(tc.name);
            if (mod) dispatchCopilotRefresh({ module: mod, action: tc.name });
          }

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.reply || "—",
              toolCalls,
              actions,
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
    [busy, lang, messages, pathname, pendingImages, t],
  );

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void send(input);
  };

  const suggestions = useMemo(
    () => copilotSuggestionsForPath(pathname || "/admin", lang),
    [pathname, lang],
  );

  const fallbackSuggestions = lang === "ar" ? SUGGESTIONS_AR : SUGGESTIONS_EN;
  const quickPrompts = suggestions.length > 0 ? suggestions : fallbackSuggestions;

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
              {!hideHeader ? (
                <MrsCookieAvatar size={72} className="mx-auto sm:hidden" />
              ) : null}
              {!hideHeader ? (
                <MrsCookieAvatar size={84} className="mx-auto hidden sm:block" />
              ) : null}
              <p
                className={cn(
                  "text-sm font-semibold text-cb-text-strong",
                  !hideHeader ? "mt-3" : undefined,
                )}
              >
                {greeting ?? t("copilot.greeting")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-cb-text-soft">
                {t("copilot.greetingSub")}
              </p>
            </div>
            <div>
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cb-text-soft">
                <Zap className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                {t("copilot.trySomething")}
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {quickPrompts.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    disabled={busy}
                    className="rounded-xl border border-cb-border bg-gradient-to-l from-white to-cb-peach/30 px-4 py-3 text-start text-sm leading-snug text-cb-text-strong transition hover:border-cb-brand-logo hover:from-amber-50 hover:to-cb-peach/50 hover:shadow-sm disabled:opacity-50"
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
                    <>
                      {m.imageUrls && m.imageUrls.length > 0 ? (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {m.imageUrls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative block h-20 w-20 overflow-hidden rounded-lg ring-1 ring-white/30"
                            >
                              <Image
                                src={url}
                                alt=""
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </a>
                          ))}
                        </div>
                      ) : null}
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </>
                  )}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-emerald-200/60 pt-2.5">
                      {m.actions.map((a, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />
                          {a.action ?? a.tool}
                        </span>
                      ))}
                    </div>
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
        className="flex shrink-0 flex-col gap-2.5 border-t border-cb-border bg-cb-surface-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5"
      >
        <ChatImagePreviewStrip pending={pendingImages} onChange={setPendingImages} />
        <div className="flex items-end gap-2">
          <ChatImageAttachButton
            context="admin"
            pending={pendingImages}
            onChange={setPendingImages}
            disabled={busy}
          />
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
            className="max-h-36 min-h-[48px] flex-1 resize-none rounded-xl border border-cb-border bg-cb-surface px-3.5 py-3 text-sm text-cb-text-strong placeholder:text-cb-text-soft focus:border-cb-brand-logo focus:outline-none focus:ring-2 focus:ring-cb-brand-logo/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={
              busy ||
              hasUploadingAttachments(pendingImages) ||
              (!input.trim() && readyAttachments(pendingImages).length === 0)
            }
            className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-cb-brand-logo px-4 text-sm font-semibold text-white transition hover:bg-cb-brand-logo-dark disabled:opacity-40"
            aria-label={t("copilot.send")}
          >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          <span className="hidden sm:inline">{t("copilot.send")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
