"use client";

import { Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type VoiceInputButtonProps = {
  locale: "ar" | "en";
  disabled?: boolean;
  onTranscript: (text: string) => void;
  labelStart: string;
  labelStop: string;
  unsupportedLabel: string;
};

export function VoiceInputButton({
  locale,
  disabled,
  onTranscript,
  labelStart,
  labelStop,
  unsupportedLabel,
}: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor || disabled) return;

    const rec = new Ctor();
    rec.lang = locale === "ar" ? "ar-EG" : "en-US";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript?.trim();
      if (text) onTranscript(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [disabled, locale, onTranscript]);

  useEffect(() => () => stop(), [stop]);

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title={unsupportedLabel}
        className="shrink-0 rounded-xl border border-cb-border/60 p-3 opacity-40"
        aria-label={unsupportedLabel}
      >
        <Mic className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (listening ? stop() : start())}
      className={cn(
        "shrink-0 rounded-xl border p-3 transition-colors",
        listening
          ? "border-red-300/80 bg-red-50 text-red-700"
          : "border-cb-border/80 bg-white/90 text-cb-text-strong hover:bg-cb-peach/40",
        disabled && "pointer-events-none opacity-50",
      )}
      aria-label={listening ? labelStop : labelStart}
      aria-pressed={listening}
    >
      {listening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
