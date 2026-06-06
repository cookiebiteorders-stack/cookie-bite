"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, Maximize2 } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { CopilotChat } from "@/components/admin/copilot/copilot-chat";
import { MrsCookieAvatar } from "@/components/admin/copilot/mrs-cookie-avatar";
import {
  clampCopilotDragPosition,
  clampCopilotFabBottom,
  copilotFabInsetPx,
  copilotFabSizePx,
  defaultCopilotFabPosition,
  loadCopilotFabPosition,
  rectToCopilotFabPosition,
  saveCopilotFabPosition,
  type CopilotFabPosition,
} from "@/lib/admin/copilot/copilot-fab-position";
import { cn } from "@/lib/utils";

const DRAG_THRESHOLD_PX = 8;

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 639px)").matches;
}

export function CopilotLauncher() {
  const pathname = usePathname();
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const onDedicatedPage = pathname?.startsWith("/admin/copilot");

  const fabRef = useRef<HTMLButtonElement>(null);
  const dragSession = useRef<{
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);
  const pointerMoved = useRef(false);
  const pendingDragRef = useRef<{ left: number; top: number } | null>(null);
  const dragFlushRafRef = useRef<number | null>(null);

  const [fabPos, setFabPos] = useState<CopilotFabPosition>(() => {
    if (typeof window === "undefined") return defaultCopilotFabPosition(false);
    const mobile = isMobileViewport();
    const saved = loadCopilotFabPosition();
    if (!saved) return defaultCopilotFabPosition(mobile);
    return {
      ...saved,
      bottomPx: clampCopilotFabBottom(saved.bottomPx, window.innerHeight, mobile),
    };
  });
  const [dragPx, setDragPx] = useState<{ left: number; top: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const sync = () => {
      const mobile = isMobileViewport();
      setIsMobile(mobile);
      setFabPos((prev) => ({
        ...prev,
        bottomPx: clampCopilotFabBottom(prev.bottomPx, window.innerHeight, mobile),
      }));
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const flushPendingDrag = useCallback(() => {
    dragFlushRafRef.current = null;
    const p = pendingDragRef.current;
    if (p) setDragPx(p);
  }, []);

  const cancelDragRaf = useCallback(() => {
    if (dragFlushRafRef.current != null) {
      cancelAnimationFrame(dragFlushRafRef.current);
      dragFlushRafRef.current = null;
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (open) return;
    const el = fabRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragSession.current = {
      startX: e.clientX,
      startY: e.clientY,
      originLeft: rect.left,
      originTop: rect.top,
    };
    pointerMoved.current = false;
    el.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const session = dragSession.current;
    if (!session) return;
    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;
    if (!pointerMoved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    pointerMoved.current = true;
    const mobile = isMobileViewport();
    const { left, top } = clampCopilotDragPosition(
      session.originLeft + dx,
      session.originTop + dy,
      window.innerWidth,
      window.innerHeight,
      mobile,
    );
    pendingDragRef.current = { left, top };
    if (dragFlushRafRef.current == null) {
      dragFlushRafRef.current = requestAnimationFrame(flushPendingDrag);
    }
  };

  const finishDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = fabRef.current;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    cancelDragRaf();

    const session = dragSession.current;
    const didMove = pointerMoved.current;
    dragSession.current = null;
    pointerMoved.current = false;

    if (!didMove) {
      setDragPx(null);
      setOpen(true);
      return;
    }

    if (session) {
      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;
      const mobile = isMobileViewport();
      const p = clampCopilotDragPosition(
        session.originLeft + dx,
        session.originTop + dy,
        window.innerWidth,
        window.innerHeight,
        mobile,
      );
      setDragPx(null);
      const sz = copilotFabSizePx(mobile);
      const rect = new DOMRect(p.left, p.top, sz, sz);
      const next = rectToCopilotFabPosition(
        rect,
        window.innerWidth,
        window.innerHeight,
        mobile,
      );
      setFabPos(next);
      saveCopilotFabPosition(next);
      return;
    }
    setDragPx(null);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = fabRef.current;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    cancelDragRaf();
    dragSession.current = null;
    pointerMoved.current = false;
    setDragPx(null);
  };

  useLayoutEffect(() => {
    const el = fabRef.current;
    if (!el) return;
    el.style.setProperty("position", "fixed");
    el.style.setProperty("z-index", "45");
    el.style.setProperty("touch-action", "none");

    if (dragPx) {
      el.style.setProperty("left", `${dragPx.left}px`);
      el.style.setProperty("top", `${dragPx.top}px`);
      el.style.setProperty("right", "auto");
      el.style.setProperty("bottom", "auto");
      return;
    }

    const inset = copilotFabInsetPx();
    if (fabPos.side === "left") {
      el.style.setProperty("left", `${inset}px`);
      el.style.setProperty("right", "auto");
    } else {
      el.style.setProperty("right", `${inset}px`);
      el.style.setProperty("left", "auto");
    }
    el.style.setProperty("bottom", `${fabPos.bottomPx}px`);
    el.style.setProperty("top", "auto");
  }, [dragPx, fabPos.side, fabPos.bottomPx]);

  if (onDedicatedPage) return null;

  const panelSide = fabPos.side === "left" ? "left-0" : "right-0";
  const fabSize = copilotFabSizePx(isMobile);

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={handlePointerCancel}
        aria-label={t("copilot.openLauncher")}
        className={cn(
          "cursor-grab select-none items-center justify-center overflow-visible rounded-full bg-transparent p-0 shadow-none ring-0",
          "drop-shadow-[0_4px_14px_rgba(42,24,16,0.28)]",
          "hover:drop-shadow-[0_6px_20px_rgba(224,77,0,0.35)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cb-focus",
          "touch-none active:cursor-grabbing",
          !dragPx &&
            "motion-safe:transition-[left,top,right,bottom,transform,filter] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
          dragPx && "!transition-none scale-[1.05]",
          open && "pointer-events-none invisible opacity-0",
        )}
        style={{ width: fabSize, height: fabSize }}
      >
        <MrsCookieAvatar size={fabSize} bare transparent />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50"
          dir={lang === "ar" ? "rtl" : "ltr"}
          role="dialog"
          aria-modal="true"
          aria-label={t("copilot.title")}
        >
          <button
            type="button"
            aria-label={t("copilot.close")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          />
          <aside
            className={
              "absolute inset-y-0 flex w-full max-w-full flex-col bg-cb-surface shadow-2xl sm:max-w-[min(100vw,560px)] " +
              panelSide
            }
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cb-border px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <MrsCookieAvatar size={40} bare transparent />
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-cb-text-strong">
                    {t("copilot.title")}
                  </p>
                  <p className="truncate text-xs text-cb-text-soft sm:text-sm">
                    {t("copilot.subtitle")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href="/admin/copilot"
                  onClick={() => setOpen(false)}
                  aria-label={t("copilot.openFullPage")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-cb-peach/40"
                >
                  <Maximize2 className="h-4 w-4" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("copilot.close")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-cb-peach/40"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </header>
            <div className="flex min-h-0 flex-1 flex-col bg-cb-surface-2">
              <CopilotChat fillParent hideHeader />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
