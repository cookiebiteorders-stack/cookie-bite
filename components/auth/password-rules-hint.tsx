"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type PasswordRulesHintProps = {
  containerRef: React.RefObject<HTMLElement | null>;
  variant?: "auth" | "settings";
};

function isPasswordInput(el: EventTarget | null): el is HTMLInputElement {
  return el instanceof HTMLInputElement && el.type === "password";
}

export function PasswordRulesHint({
  containerRef,
  variant = "auth",
}: PasswordRulesHintProps) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: 280 });
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const rules = [
    t("passwordRules.ruleLength"),
    t("passwordRules.ruleTyping"),
    t("passwordRules.ruleMix"),
    t("passwordRules.ruleOAuth"),
  ];

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const updateAnchor = useCallback((input: HTMLInputElement) => {
    const rect = input.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 280), window.innerWidth - 24);
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 12,
    );
    setAnchor({
      top: rect.bottom + 8,
      left,
      width,
    });
  }, []);

  const showForInput = useCallback(
    (input: HTMLInputElement) => {
      clearHideTimer();
      activeInputRef.current = input;
      updateAnchor(input);
      setOpen(true);
    },
    [clearHideTimer, updateAnchor],
  );

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => setOpen(false), 180);
  }, [clearHideTimer]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onFocusIn = (event: FocusEvent) => {
      if (isPasswordInput(event.target)) showForInput(event.target);
    };

    const onFocusOut = (event: FocusEvent) => {
      if (isPasswordInput(event.target)) scheduleHide();
    };

    const onScrollOrResize = () => {
      if (activeInputRef.current && open) {
        updateAnchor(activeInputRef.current);
      }
    };

    container.addEventListener("focusin", onFocusIn);
    container.addEventListener("focusout", onFocusOut);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    const observer = new MutationObserver(() => {
      const focused = container.querySelector('input[type="password"]:focus');
      if (focused instanceof HTMLInputElement) showForInput(focused);
    });
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      container.removeEventListener("focusin", onFocusIn);
      container.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      observer.disconnect();
      clearHideTimer();
    };
  }, [containerRef, showForInput, scheduleHide, updateAnchor, open, clearHideTimer]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="tooltip"
      aria-live="polite"
      aria-label={t("passwordRules.title")}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={cn(
        "password-rules-hint pointer-events-auto rounded-xl border border-cb-border",
        "bg-cb-surface px-3.5 py-3 text-sm shadow-lg ring-1 ring-cb-brand-200/60",
        "dark:bg-cb-surface-elevated dark:ring-cb-border",
        "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150",
      )}
      style={{
        position: "fixed",
        top: anchor.top,
        left: anchor.left,
        width: anchor.width,
        zIndex: 130,
      }}
      onMouseEnter={clearHideTimer}
      onMouseLeave={scheduleHide}
    >
      <p className="font-semibold text-cb-text-strong">{t("passwordRules.title")}</p>
      <p className="mt-1 text-xs leading-relaxed text-cb-text-muted">
        {variant === "auth" ? t("passwordRules.authIntro") : t("passwordRules.settingsIntro")}
      </p>
      <ul className="mt-2 space-y-1 text-xs text-cb-text">
        {rules.map((rule) => (
          <li key={rule} className="flex gap-2">
            <span aria-hidden className="mt-0.5 text-cb-brand-600 dark:text-cb-brand-300">
              •
            </span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-relaxed text-cb-text-muted">
        {t("passwordRules.typingHint")}
      </p>
    </div>,
    document.body,
  );
}
