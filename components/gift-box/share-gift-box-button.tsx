"use client";

import { useState } from "react";
import { CheckCheck, Copy, MessageCircle, Share2 } from "lucide-react";
import type { BuilderProduct } from "@/lib/gift-box-builder/data";
import type { GiftBoxBuilderState } from "@/lib/gift-box-builder/types";
import { buildShareInputFromBuilder } from "@/lib/gift-box/build-share-payload";
import { useLanguage } from "@/components/providers/language-provider";

type Props = {
  state: GiftBoxBuilderState;
  products: BuilderProduct[];
  disabled?: boolean;
  className?: string;
};

export function ShareGiftBoxButton({ state, products, disabled, className }: Props) {
  const { lang } = useLanguage();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ar = lang === "ar";

  async function generateLink() {
    const payload = buildShareInputFromBuilder(state, products);
    if (!payload) {
      setError(ar ? "أكمل الصندوق أولاً." : "Complete your box first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gift-box/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as {
        share_url?: string;
        error?: { en?: string; ar?: string };
      } | null;
      if (!res.ok || !data?.share_url) {
        setError(
          (ar ? data?.error?.ar : data?.error?.en) ??
            (ar ? "تعذر إنشاء الرابط." : "Could not create link."),
        );
        return;
      }
      setShareUrl(data.share_url);
    } catch {
      setError(ar ? "خطأ في الشبكة." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(ar ? "تعذر النسخ." : "Could not copy.");
    }
  }

  const shareText = ar
    ? "شوف صندوق الهدايا اللي صممته 🎁🍪"
    : "Check out the gift box I designed 🎁🍪";

  return (
    <div className={className}>
      {!shareUrl ? (
        <button
          type="button"
          onClick={() => void generateLink()}
          disabled={disabled || loading}
          className="gb-share-trigger"
        >
          <Share2 size={15} aria-hidden />
          {loading
            ? ar
              ? "جاري الإنشاء…"
              : "Creating link…"
            : ar
              ? "شارك الصندوق"
              : "Share box"}
        </button>
      ) : (
        <div className="gb-share-panel">
          <p className="gb-share-panel__title">
            {ar ? "رابط المشاركة جاهز!" : "Share link is ready!"}
          </p>
          <div className="gb-share-panel__row">
            <div className="gb-share-panel__url" dir="ltr">
              {shareUrl}
            </div>
            <button
              type="button"
              onClick={() => void copyLink()}
              className={`gb-share-copy ${copied ? "is-copied" : ""}`}
              aria-label={ar ? "نسخ الرابط" : "Copy link"}
            >
              {copied ? <CheckCheck size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="gb-share-whatsapp"
          >
            <MessageCircle size={15} aria-hidden />
            WhatsApp
          </a>
        </div>
      )}
      {error ? (
        <p className="gb-share-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
