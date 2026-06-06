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

function isSecureSpeechContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext;
}

type VoiceInputButtonProps = {
  locale: "ar" | "en";
  disabled?: boolean;
  compact?: boolean;
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  labelStart: string;
  labelStop: string;
  unsupportedLabel: string;
  permissionDeniedLabel?: string;
};

export function VoiceInputButton({
  locale,
  disabled,
  compact,
  onTranscript,
  onError,
  labelStart,
  labelStop,
  unsupportedLabel,
  permissionDeniedLabel,
}: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()) && isSecureSpeechContext());
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor || disabled) return;

    if (!isSecureSpeechContext()) {
      onError?.(unsupportedLabel);
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        for (const track of stream.getTracks()) track.stop();
      }
    } catch {
      onError?.(permissionDeniedLabel ?? unsupportedLabel);
      return;
    }

    const rec = new Ctor();
    rec.lang = locale === "ar" ? "ar-EG" : "en-US";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (ev) => {
      const parts: string[] = [];
      for (let i = 0; i < ev.results.length; i++) {
        const chunk = ev.results[i]?.[0]?.transcript?.trim();
        if (chunk) parts.push(chunk);
      }
      const text = parts.join(" ").trim();
      if (text) onTranscript(text);
    };
    rec.onerror = (ev) => {
      const code = ev.error ?? "";
      if (code === "not-allowed" || code === "service-not-allowed") {
        onError?.(permissionDeniedLabel ?? unsupportedLabel);
      } else if (code !== "aborted" && code !== "no-speech") {
        onError?.(unsupportedLabel);
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      onError?.(unsupportedLabel);
    }
  }, [
    disabled,
    locale,
    onError,
    onTranscript,
    permissionDeniedLabel,
    unsupportedLabel,
  ]);

  useEffect(() => () => stop(), [stop]);

  const btnClass = cn(
    "shrink-0 rounded-xl border transition-colors",
    compact ? "p-2" : "p-3",
    listening
      ? "border-red-300/80 bg-red-50 text-red-700"
      : "border-cb-border/80 bg-white/90 text-cb-text-strong hover:bg-cb-peach/40",
    disabled && "pointer-events-none opacity-50",
    !supported && "opacity-40",
  );

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title={unsupportedLabel}
        className={btnClass}
        aria-label={unsupportedLabel}
      >
        <Mic className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (listening ? stop() : void start())}
      className={btnClass}
      aria-label={listening ? labelStop : labelStart}
      aria-pressed={listening}
    >
      {listening ? (
        <Square className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", "fill-current")} />
      ) : (
        <Mic className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      )}
    </button>
  );
}
