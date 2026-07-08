"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { fetchJson } from "@/lib/http/fetch-json";
import { trackGa4Event } from "@/lib/analytics/ga4";

type Props = {
  itemCount: number;
  className?: string;
};

export function ShareWishlistButton({ itemCount, className }: Props) {
  const { isSignedIn } = useSupabaseAuth();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isSignedIn || itemCount < 1) return null;

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetchJson<{ token?: string }>("/api/wishlist/share", {
        method: "POST",
      });
      if (!res.token) return;
      const url = `${window.location.origin}/wishlist/share/${encodeURIComponent(res.token)}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackGa4Event("wishlist_shared", { item_count: itemCount });
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* toast optional */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void share()}
      className={className ?? buttonClassName("outline", "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold")}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
      ) : (
        <Link2 className="h-3.5 w-3.5" aria-hidden />
      )}
      {copied ? t("pages.wishlistShare.linkCopied") : t("pages.wishlistShare.shareButton")}
    </button>
  );
}
