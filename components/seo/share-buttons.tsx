"use client";

import { useState } from "react";
import { buttonClassName } from "@/components/ui/button";

type Props = {
  title: string;
  className?: string;
};

export function ShareButtons({ title, className }: Props) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, text: title, url });
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={nativeShare}
          className={buttonClassName("outline", "text-xs")}
        >
          Share
        </button>
        <button
          type="button"
          onClick={copyLink}
          className={buttonClassName("outline", "text-xs")}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&hashtags=cookiebite,cookies,cairo`}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName("outline", "text-xs")}
        >
          X
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName("outline", "text-xs")}
        >
          LinkedIn
        </a>
        <a
          href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName("outline", "text-xs")}
        >
          WhatsApp
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName("outline", "text-xs")}
        >
          Facebook
        </a>
        <a
          href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName("outline", "text-xs")}
        >
          Telegram
        </a>
      </div>
    </div>
  );
}

