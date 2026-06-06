"use client";

import { useEffect, useState } from "react";

type Options = {
  /** أقصى انتظار لـ requestIdleCallback قبل التفعيل القسري */
  idleTimeout?: number;
  /** بديل setTimeout عند غياب idle */
  fallbackMs?: number;
};

/**
 * يُفعّل بعد أول تفاعل (نقر/لمس/تمرير/مفتاح) أو idle — يحسّن TTI بتأجيل JS غير الحرج.
 */
export function useDeferredReady(options?: Options): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    let settled = false;
    const idleTimeout = options?.idleTimeout ?? 4500;
    const fallbackMs = options?.fallbackMs ?? 3800;

    const finish = () => {
      if (settled) return;
      settled = true;
      setReady(true);
      removeEarlyListeners();
    };

    const listenerOpts: AddEventListenerOptions = {
      capture: true,
      passive: true,
      once: true,
    };

    const removeEarlyListeners = () => {
      window.removeEventListener("pointerdown", finish, listenerOpts);
      window.removeEventListener("keydown", finish, listenerOpts);
      window.removeEventListener("scroll", finish, listenerOpts);
    };

    window.addEventListener("pointerdown", finish, listenerOpts);
    window.addEventListener("keydown", finish, listenerOpts);
    window.addEventListener("scroll", finish, listenerOpts);

    let idleId: number | undefined;
    let timerId: ReturnType<typeof globalThis.setTimeout> | undefined;

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(finish, { timeout: idleTimeout });
    } else {
      timerId = globalThis.setTimeout(finish, fallbackMs);
    }

    return () => {
      removeEarlyListeners();
      if (idleId != null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timerId != null) window.clearTimeout(timerId);
    };
  }, [ready, options?.fallbackMs, options?.idleTimeout]);

  return ready;
}
