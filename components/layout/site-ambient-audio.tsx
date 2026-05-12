"use client";

import { useEffect, useRef } from "react";

const AUDIO_SRC = "/audio/cookie-bite-sounds.mpeg";
/** 15% مستوى صوت */
const VOLUME = 0.15;

export function SiteAmbientAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    el.volume = VOLUME;
    el.loop = true;

    const play = () => {
      void el.play().catch(() => {
        /* سياسات التشغيل التلقائي في المتصفح */
      });
    };

    play();

    const onFirstGesture = () => {
      play();
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };

    window.addEventListener("pointerdown", onFirstGesture, { passive: true });
    window.addEventListener("keydown", onFirstGesture);

    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      src={AUDIO_SRC}
      preload="auto"
      loop
      playsInline
      className="pointer-events-none fixed h-px w-px overflow-hidden opacity-0"
      aria-hidden
      tabIndex={-1}
    />
  );
}
