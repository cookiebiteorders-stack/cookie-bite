"use client";

import { useEffect, useRef, useState } from "react";
// @ts-ignore - react-dom types are installed but deployment environment may not recognize them
import { createPortal } from "react-dom";
import { Bell, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickActionId =
  | "bulk_email"
  | "bulk_sms"
  | "tags"
  | "tier"
  | "export"
  | "insights";

const ITEMS: Array<{ id: QuickActionId; label: string }> = [
  { id: "bulk_email", label: "بريد جماعي" },
  { id: "bulk_sms", label: "SMS جماعي" },
  { id: "tags", label: "تعيين وسوم" },
  { id: "tier", label: "تحديث المستوى" },
  { id: "export", label: "تصدير تقارير" },
  { id: "insights", label: "توليد رؤى" },
];

type Props = {
  onAction: (id: QuickActionId) => void;
  buttonClassName?: string;
};

export function CrmQuickActionsMenu({ onAction, buttonClassName }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const update = () => {
      const r = btnRef.current!.getBoundingClientRect();
      const menuW = 240;
      const left = Math.max(8, Math.min(r.right - menuW, window.innerWidth - menuW - 8));
      setPos({ top: r.bottom + 6, left, width: menuW });
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
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      const menu = document.getElementById("crm-quick-actions-menu");
      if (menu?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <ul
            id="crm-quick-actions-menu"
            role="menu"
            className="fixed z-[200] overflow-hidden rounded-xl border border-cb-border bg-cb-surface-elevated py-1 text-start shadow-2xl"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2.5 text-xs font-semibold text-stone-800 hover:bg-amber-50"
                  onClick={() => {
                    setOpen(false);
                    onAction(item.id);
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
        className={cn(
          buttonClassName ??
            "admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold",
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4 shrink-0" aria-hidden />
        إجراءات سريعة
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} aria-hidden />
      </button>
      {menu}
    </>
  );
}
