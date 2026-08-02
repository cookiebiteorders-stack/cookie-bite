"use client";

import { useEffect, useRef, useState } from "react";
// @ts-ignore - react-dom types are installed but deployment environment may not recognize them
import { createPortal } from "react-dom";
import { Brain, ChevronDown } from "lucide-react";
import { generatePromoCode } from "@/lib/promo/promo-metadata";
import { cn } from "@/lib/utils";

type Props = {
  onGenerateCode: (code: string) => void;
  onSuggestValue: (value: string) => void;
  onPauseExpiring: () => void;
  onFocusExpiring: () => void;
  label: string;
};

export function DiscountAiMenu({
  onGenerateCode,
  onSuggestValue,
  onPauseExpiring,
  onFocusExpiring,
  label,
}: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 240 });

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const update = () => {
      const r = btnRef.current!.getBoundingClientRect();
      const w = 260;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      setPos({ top: r.bottom + 6, left, width: w });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (document.getElementById("discount-ai-menu")?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const items = [
    {
      id: "code",
      label: "توليد كود عشوائي",
      action: () => onGenerateCode(generatePromoCode("COOKIE")),
    },
    {
      id: "value",
      label: "اقتراح 10% (آمن للهامش)",
      action: () => onSuggestValue("10"),
    },
    {
      id: "filter",
      label: "عرض المنتهية قريباً",
      action: onFocusExpiring,
    },
    {
      id: "pause",
      label: "إيقاف كل «تنتهي قريباً»",
      action: onPauseExpiring,
    },
  ];

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <ul
            id="discount-ai-menu"
            className="fixed z-[200] rounded-xl border border-cb-border bg-white py-1 shadow-2xl"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-start text-xs font-semibold text-stone-800 hover:bg-amber-50"
                  onClick={() => {
                    setOpen(false);
                    item.action();
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 self-start rounded-2xl border border-cb-border bg-white/85 px-4 py-2 text-sm font-bold text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
      >
        <Brain className="h-4 w-4" />
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>
      {menu}
    </>
  );
}
