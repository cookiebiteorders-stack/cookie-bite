"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { GiftRevealPublic } from "@/lib/gift-box/reveal";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  token: string;
  lang?: "en" | "ar";
};

type RevealPhase = "closed" | "shaking" | "opening" | "open";

const REACTIONS = [
  { id: "love", emoji: "❤️" },
  { id: "wow", emoji: "😮" },
  { id: "yum", emoji: "🤤" },
  { id: "thanks", emoji: "🙏" },
] as const;

export function GiftRevealClient({ token, lang = "en" }: Props) {
  const ar = lang === "ar";
  const [order, setOrder] = useState<GiftRevealPublic | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [phase, setPhase] = useState<RevealPhase>("closed");
  const [reaction, setReaction] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orders/reveal/${encodeURIComponent(token)}`);
        if (!res.ok) {
          if (!cancelled) setLoadError(true);
          return;
        }
        const data = (await res.json()) as { order?: GiftRevealPublic };
        if (!cancelled) {
          setOrder(data.order ?? null);
          if (data.order?.reveal_reaction) setReaction(data.order.reveal_reaction);
          if (data.order?.reveal_viewed_at) setPhase("open");
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function openGift() {
    if (phase !== "closed") return;
    setPhase("shaking");
    window.setTimeout(() => setPhase("opening"), 800);
    window.setTimeout(() => setPhase("open"), 1600);
  }

  async function sendReaction(id: string) {
    setReaction(id);
    await fetch(`/api/orders/reveal/${encodeURIComponent(token)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction: id }),
    }).catch(() => undefined);
  }

  if (loadError) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-cb-cream px-4">
        <p className="text-center text-cb-text-muted">
          {ar ? "الهدية غير متاحة أو لم تُدفع بعد." : "This gift is not available yet."}
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-cb-cream">
        <p className="text-sm text-cb-text-muted">{ar ? "جاري التحميل…" : "Loading…"}</p>
      </div>
    );
  }

  const snapshot = order.gift_box_snapshot;
  const senderLabel = order.anonymous_sender
    ? ar
      ? "من شخص يحبك"
      : "From someone who cares"
    : order.sender_name
      ? ar
        ? `من ${order.sender_name}`
        : `From ${order.sender_name}`
      : ar
        ? "هدية لك"
        : "A gift for you";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-[#2a1810] via-[#3d2618] to-[#1a0f0a] px-4 py-12 text-white">
      {phase === "open" ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="absolute animate-bounce text-lg opacity-80"
              style={{
                left: `${(i * 17) % 100}%`,
                top: `${(i * 13) % 60}%`,
                animationDelay: `${i * 0.12}s`,
              }}
            >
              {i % 3 === 0 ? "🍪" : "✨"}
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative z-10 mx-auto max-w-md text-center">
        <p className="text-sm text-amber-200/80">{senderLabel}</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-amber-100">
          {ar ? "لديك هدية!" : "You have a gift!"}
        </h1>

        <button
          type="button"
          onClick={openGift}
          disabled={phase === "open"}
          className={cn(
            "mx-auto mt-10 block text-8xl transition-transform",
            phase === "shaking" && "animate-[wiggle_0.4s_ease-in-out_infinite]",
            phase === "opening" && "scale-110",
            phase === "open" && "scale-0 opacity-0",
          )}
          aria-label={ar ? "افتح الهدية" : "Open gift"}
        >
          🎁
        </button>

        {phase === "closed" ? (
          <p className="mt-6 text-sm text-amber-200/70">
            {ar ? "اضغط لفتح الصندوق" : "Tap to open the box"}
          </p>
        ) : null}

        <div
          className={cn(
            "mt-8 space-y-4 transition-all duration-700",
            phase === "open" ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
          )}
        >
          {(order.gift_message || snapshot?.msgText) && (
            <blockquote className="rounded-2xl border border-amber-200/20 bg-white/10 px-4 py-3 text-sm italic">
              &ldquo;{order.gift_message ?? snapshot?.msgText}&rdquo;
            </blockquote>
          )}

          {snapshot?.items?.length ? (
            <ul className="space-y-2 rounded-2xl bg-white/10 p-4 text-start text-sm">
              {snapshot.items.map((item) => (
                <li key={item.productId} className="flex items-center gap-3">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="text-xl">🍪</span>
                  )}
                  <span className="flex-1 truncate">{item.name}</span>
                  <span className="text-amber-200">×{item.quantity}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {snapshot?.totalPrice != null ? (
            <p className="text-xs text-amber-200/60">
              {ar ? "قيمة تقريبية" : "Approx. value"}: {Math.round(snapshot.totalPrice)}{" "}
              {BRAND.currency}
            </p>
          ) : null}

          <div className="pt-4">
            <p className="mb-3 text-xs text-amber-200/70">
              {ar ? "كيف تشعر؟" : "How do you feel?"}
            </p>
            <div className="flex justify-center gap-3">
              {REACTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => void sendReaction(r.id)}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full text-xl transition",
                    reaction === r.id
                      ? "bg-amber-400/30 ring-2 ring-amber-300"
                      : "bg-white/10 hover:bg-white/20",
                  )}
                  aria-pressed={reaction === r.id}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes wiggle {
          0%,
          100% {
            transform: rotate(-4deg);
          }
          50% {
            transform: rotate(4deg);
          }
        }
      `}</style>
    </div>
  );
}
