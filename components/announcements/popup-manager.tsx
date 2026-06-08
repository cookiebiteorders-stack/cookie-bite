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
        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cb-popup-title"
      >
        <motion.div
          className={cn(
            "relative w-full max-w-md rounded-2xl border border-cb-border/60 bg-cb-surface p-5 shadow-xl",
            "max-sm:max-h-[85vh] max-sm:overflow-y-auto max-sm:rounded-b-none",
          )}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
        >
          {active.dismissible ? (
            <button
              type="button"
              className="absolute end-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-cb-hover-overlay"
              aria-label="Close"
              onClick={() => close(true)}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          <h2 id="cb-popup-title" className="pe-8 text-lg font-semibold text-cb-text-strong">
            {active.title}
          </h2>
          <p className="mt-2 text-sm text-cb-text">{active.message}</p>
          {active.cta ? (
            <div className="mt-4 flex gap-2">
              <Link
                href={active.cta.url}
                className={buttonClassName("primary")}
                onClick={() => {
                  void track(active.id, "click", { variantKey: active.abVariantKey });
                  close(false);
                }}
              >
                {active.cta.label}
              </Link>
              {active.dismissible ? (
                <Button variant="outline" onClick={() => close(true)}>
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
