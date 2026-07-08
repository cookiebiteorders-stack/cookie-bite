"use client";

import { useEffect, useRef } from "react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useCart } from "@/components/providers/cart-provider";

const IDLE_MS = 10 * 60 * 1000;
const DEBOUNCE_MS = 30_000;

function sendAbandonPayload(body: object) {
  const payload = JSON.stringify(body);
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/cart/abandon", new Blob([payload], { type: "application/json" }));
    return;
  }
  void fetch("/api/cart/abandon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}

/** Tracks cart idle / tab hide and syncs snapshot for recovery emails. */
export function AbandonedCartTracker() {
  const { lines } = useCart();
  const { user } = useSupabaseAuth();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linesRef = useRef(lines);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    function syncAbandoned(reason: "idle" | "hide" | "debounce") {
      const current = linesRef.current;
      if (current.length === 0) return;

      sendAbandonPayload({
        lines: current,
        email: user?.email ?? "",
        reason,
      });
    }

    function resetIdleTimer() {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (linesRef.current.length === 0) return;
      idleTimer.current = setTimeout(() => syncAbandoned("idle"), IDLE_MS);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        syncAbandoned("hide");
      } else {
        resetIdleTimer();
      }
    }

    function onActivity() {
      resetIdleTimer();
    }

    resetIdleTimer();
    window.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("scroll", onActivity, { passive: true });

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("scroll", onActivity);
    };
  }, [user?.email]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (lines.length === 0) return;

    debounceTimer.current = setTimeout(() => {
      sendAbandonPayload({
        lines,
        email: user?.email ?? "",
        reason: "debounce",
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [lines, user?.email]);

  return null;
}
