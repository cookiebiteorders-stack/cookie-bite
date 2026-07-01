"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useAnnouncements } from "@/components/providers/announcement-provider";
import { onAnnouncementTrigger } from "@/lib/announcements/events";
import { useAnnouncementTrack } from "@/lib/announcements/use-track";
import { Button, buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnnouncementView } from "@/lib/announcements/types";

function useScrollPercent() {
  const [percent, setPercent] = useState(0);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        setPercent(max > 0 ? (window.scrollY / max) * 100 : 0);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return percent;
}

function setupPopupTrigger(
  popup: AnnouncementView,
  enqueue: (id: string) => void,
  shown: Set<string>,
  scrollPercent: number,
  exitIntentRef: MutableRefObject<boolean>,
): (() => void) | void {
  if (shown.has(popup.id)) return;

  const trigger = popup.trigger;

  if (trigger.type === "immediate") {
    enqueue(popup.id);
    return;
  }

  if (trigger.type === "delay") {
    const sec = typeof trigger.value === "number" ? trigger.value : Number(trigger.value) || 5;
    const timer = window.setTimeout(() => enqueue(popup.id), sec * 1000);
    return () => window.clearTimeout(timer);
  }

  if (trigger.type === "scroll") {
    const target = typeof trigger.value === "number" ? trigger.value : Number(trigger.value) || 40;
    if (scrollPercent >= target) enqueue(popup.id);
    return;
  }

  if (trigger.type === "exit_intent" && !exitIntentRef.current) {
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 8) {
        exitIntentRef.current = true;
        enqueue(popup.id);
      }
    };
    document.addEventListener("mouseout", onLeave);
    return () => document.removeEventListener("mouseout", onLeave);
  }

  if (trigger.type === "event") {
    const eventName = String(trigger.value ?? "");
    if (!eventName) return;
    return onAnnouncementTrigger((event) => {
      if (event === eventName) enqueue(popup.id);
    });
  }
}

export function PopupManager() {
  const { getByType, loaded } = useAnnouncements();
  const { track } = useAnnouncementTrack();
  const popups = useMemo(() => getByType("popup"), [getByType]);
  const [queue, setQueue] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const scrollPercent = useScrollPercent();
  const exitIntentRef = useRef(false);

  const active = popups.find((p) => p.id === activeId) ?? null;

  const enqueue = useCallback(
    (id: string) => {
      if (shown.has(id)) return;
      setQueue((q) => (q.includes(id) ? q : [...q, id]));
    },
    [shown],
  );

  useEffect(() => {
    if (!loaded || !popups.length) return;
    const cleanups: Array<(() => void) | void> = [];
    for (const popup of popups) {
      const cleanup = setupPopupTrigger(popup, enqueue, shown, scrollPercent, exitIntentRef);
      if (typeof cleanup === "function") cleanups.push(cleanup);
    }
    return () => {
      for (const fn of cleanups) fn?.();
    };
  }, [loaded, popups, scrollPercent, shown, enqueue]);

  useEffect(() => {
    if (activeId || !queue.length) return;
    const next = queue[0];
    setActiveId(next);
    setQueue((q) => q.slice(1));
  }, [queue, activeId]);

  useEffect(() => {
    if (!active) return;
    setShown((s) => new Set(s).add(active.id));
    void track(active.id, "impression", {
      perSession: active.frequency.perSession,
      variantKey: active.abVariantKey,
    });
  }, [active, track]);

  const close = (dismiss = false) => {
    if (!active) return;
    if (dismiss) void track(active.id, "dismiss", { variantKey: active.abVariantKey });
    setActiveId(null);
  };

  if (!active) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cb-popup-title"
        onClick={() => active.dismissible && close(true)}
      >
        <motion.div
          className={cn(
            "relative w-full max-w-md rounded-2xl border border-cb-border bg-cb-surface p-5 shadow-2xl",
            "max-h-[min(85dvh,calc(100dvh-2rem))] overflow-y-auto",
            "ring-1 ring-black/5",
          )}
          initial={{ scale: 0.94, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 6 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
        >
          {active.dismissible ? (
            <button
              type="button"
              className="absolute end-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-cb-surface-2 text-cb-text-strong hover:bg-cb-hover-overlay"
              aria-label="Close"
              onClick={() => close(true)}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          <h2 id="cb-popup-title" className="pe-10 text-xl font-bold leading-snug text-cb-text-strong">
            {active.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-cb-text">{active.message}</p>
          {active.cta ? (
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href={active.cta.url}
                className={cn(buttonClassName("primary"), "w-full justify-center sm:w-auto")}
                onClick={() => {
                  void track(active.id, "click", { variantKey: active.abVariantKey });
                  close(false);
                }}
              >
                {active.cta.label}
              </Link>
              {active.dismissible ? (
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => close(true)}>
                  Later
                </Button>
              ) : null}
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
