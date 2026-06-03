"use client";

import { useState } from "react";
import { CheckCheck, Copy, Gift } from "lucide-react";
import { giftRevealUrl } from "@/lib/gift-box/reveal";

type Props = {
  revealToken: string;
};

export function GiftRevealLinkButton({ revealToken }: Props) {
  const [copied, setCopied] = useState(false);
  const url = giftRevealUrl(revealToken);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex items-center gap-1.5 rounded-full border border-cb-border bg-cb-surface px-3 py-1 text-[11px] font-semibold text-cb-text-strong transition hover:bg-cb-peach/40"
      title="Copy gift reveal link for recipient"
    >
      {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Gift className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Reveal link"}
    </button>
  );
}
