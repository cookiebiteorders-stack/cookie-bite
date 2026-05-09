"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { useMorphTransition } from "@/hooks/useMorphTransition";

type LanguageToggleProps = {
  className?: string;
  mobile?: boolean;
};

export function LanguageToggle({ className, mobile = false }: LanguageToggleProps) {
  const { lang, t } = useLanguage();
  const { morphToLanguage } = useMorphTransition();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
    setTilt({ x: nx * 5, y: ny * -4 });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const handleClick = () => {
    const next = lang === "ar" ? "en" : "ar";
    const el = btnRef.current;
    const rect = el?.getBoundingClientRect();
    const origin = rect
      ? {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        }
      : { x: lang === "ar" ? 0.9 : 0.1, y: 0.08 };
    void morphToLanguage(next, origin);
  };

  const innerStyle = {
    transform: `perspective(520px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
    transition: tilt.x === 0 && tilt.y === 0 ? "transform 0.35s cubic-bezier(0.22,1,0.36,1)" : "none",
  } as const;

  if (mobile) {
    return (
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={cn(
          "inline-flex h-11 min-h-[2.75rem] w-11 min-w-[2.75rem] items-center justify-center rounded-xl border border-cb-border bg-cb-surface/80 text-[11px] font-bold tracking-[0.03em] text-cb-text-strong shadow-sm backdrop-blur-sm transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-cb-terracotta-dark/35 hover:bg-cb-peach/50 hover:shadow-md active:scale-[0.98] dark:border-cb-border dark:bg-cb-surface-2/90 dark:text-cb-text-strong dark:hover:bg-cb-peach/20",
          className,
        )}
        aria-label={t("language.switch")}
      >
        <span className="inline-flex h-full w-full items-center justify-center will-change-transform" style={innerStyle}>
          {lang === "ar" ? t("language.en") : t("language.ar")}
        </span>
      </button>
    );
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "inline-flex h-11 min-h-[2.75rem] items-center justify-center gap-1 rounded-xl border border-cb-border bg-cb-surface/80 px-3 text-xs font-semibold tracking-[0.04em] text-cb-text-strong shadow-sm backdrop-blur-sm transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-cb-terracotta-dark/35 hover:bg-cb-peach/50 hover:shadow-md active:scale-[0.98] dark:border-cb-border dark:bg-cb-surface-2/90 dark:text-cb-text-strong dark:hover:bg-cb-peach/20",
        className,
      )}
      aria-label={t("language.switch")}
    >
      <span className="inline-flex items-center gap-1 will-change-transform" style={innerStyle}>
        <span className={lang === "ar" ? "opacity-100 font-bold" : "opacity-50"}>{t("language.ar")}</span>
        <span className="opacity-35">|</span>
        <span className={lang === "en" ? "opacity-100 font-bold" : "opacity-50"}>{t("language.en")}</span>
      </span>
    </button>
  );
}
