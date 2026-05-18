"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type NavDropdownItem = { href: string; label: string };

/** يُطبَّق على لوحات القوائم الطويلة */
export const navMenuPanelClass =
  "rounded-2xl border border-cb-border bg-cb-surface py-1.5 shadow-lg ring-1 ring-cb-peach-deep/30 dark:bg-cb-surface-2";

export const navMenuScrollClass =
  "max-h-[min(70vh,18rem)] overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]";

/** عند تجاوز هذا العدد تُفعَّل التمرير داخل القائمة */
const SCROLL_ITEM_THRESHOLD = 5;

type NavDropdownProps = {
  label: ReactNode;
  items: NavDropdownItem[];
  className?: string;
  /** يبرز الزر عندما يكون المسار الحالي ضمن أحد الروابط (مثل لوحة الإدارة). */
  isActive?: boolean;
  align?: "start" | "end";
};

export function NavDropdown({
  label,
  items,
  className,
  isActive,
  align = "start",
}: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const pathname = usePathname();
  const scrollable = items.length > SCROLL_ITEM_THRESHOLD;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => setOpen(false));
  }, [pathname]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-cb-text-strong transition-colors duration-200 hover:bg-cb-hover-overlay hover:text-cb-terracotta-dark",
          open && "bg-cb-hover-overlay text-cb-terracotta-dark",
          isActive &&
            "text-cb-text-strong underline decoration-[1.5px] underline-offset-[10px] decoration-cb-terracotta-dark/80 dark:decoration-cb-terracotta/70",
        )}
      >
        {label}
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-2 min-w-[12.5rem]",
            align === "end" ? "end-0" : "start-0",
            navMenuPanelClass,
          )}
        >
          <div
            className={cn(scrollable && navMenuScrollClass)}
            aria-label={typeof label === "string" ? label : undefined}
          >
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  role="menuitem"
                  href={item.href}
                  className={cn(
                    "block px-4 py-2.5 text-sm font-semibold text-cb-text transition-colors hover:bg-cb-peach/70 hover:text-cb-terracotta-dark dark:hover:bg-cb-peach/15",
                    active && "bg-cb-peach/40 text-cb-terracotta-dark dark:bg-cb-peach/10",
                  )}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
