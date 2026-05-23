"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getChatbotConfig } from "@/lib/ai-chat/config";
import { getTypingDelay } from "@/lib/ai-chat/typing-delays";

type UseTypingEffectOptions = {
  /** النص الكامل الوارد من الـ stream */
  target: string;
  /** ما زال التوليد جارياً */
  active: boolean;
  /** عند false يُعرض النص فوراً */
  enabled?: boolean;
};

/**
 * يعرض النص تدريجياً بسرعة بشرية — يتبع الـ stream حياً.
 */
export function useTypingEffect({
  target,
  active,
  enabled = getChatbotConfig().typing.enabled,
}: UseTypingEffectOptions) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = getChatbotConfig().typing;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(target);
      indexRef.current = target.length;
      return;
    }

    if (!active && indexRef.current >= target.length) {
      setDisplayed(target);
      return;
    }

    const tick = () => {
      const i = indexRef.current;
      if (i >= target.length) {
        if (!active) return;
        timerRef.current = setTimeout(tick, 40);
        return;
      }

      const nextIndex = Math.min(
        target.length,
        i + Math.max(1, getChatbotConfig().streaming.chunkSize),
      );
      const slice = target.slice(i, nextIndex);
      indexRef.current = nextIndex;
      setDisplayed((prev) => prev + slice);

      const lastChar = slice.slice(-1) || " ";
      const delay = getTypingDelay(lastChar, config);
      timerRef.current = setTimeout(tick, delay);
    };

    clearTimer();
    timerRef.current = setTimeout(tick, config.minDelay);

    return clearTimer;
  }, [target, active, enabled, config, clearTimer]);

  useEffect(() => {
    if (target.length < indexRef.current) {
      indexRef.current = 0;
      setDisplayed("");
    }
  }, [target]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return displayed;
}
