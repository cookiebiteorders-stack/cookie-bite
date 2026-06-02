"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, RotateCcw } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import type { GiftBoxOrderSnapshot } from "@/lib/gift-box/order-snapshot";

type Props = {
  orderId: string;
  orderType?: string | null;
  hasSnapshot: boolean;
};

export function ReorderGiftBoxButton({ orderId, orderType, hasSnapshot }: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const router = useRouter();
  const { restoreGiftBox } = useCart();
  const [state, setState] = useState<"idle" | "loading" | "confirm" | "unavailable">("idle");
  const [snapshot, setSnapshot] = useState<GiftBoxOrderSnapshot | null>(null);
  const [unavailable, setUnavailable] = useState<string[]>([]);

  if (orderType !== "gift_box" || !hasSnapshot) return null;

  async function handleReorder() {
    setState("loading");
    try {
      const res = await fetch(`/api/orders/${orderId}/reorder`, { method: "POST" });
      const data = (await res.json()) as {
        snapshot?: GiftBoxOrderSnapshot;
        unavailableItems?: string[];
        error?: { en?: string; ar?: string };
      };
      if (!res.ok) {
        throw new Error((ar && data.error?.ar) || data.error?.en || "Failed");
      }
      if (data.unavailableItems?.length) {
        setUnavailable(data.unavailableItems);
        setState("unavailable");
        return;
      }
      if (!data.snapshot) {
        throw new Error("Missing snapshot");
      }
      setSnapshot(data.snapshot);
      setState("confirm");
    } catch {
      setState("idle");
    }
  }

  function confirmReorder() {
    if (!snapshot) return;
    restoreGiftBox(snapshot);
    router.push("/gift-box/build");
  }

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={() => void handleReorder()}
        className="inline-flex items-center gap-1.5 rounded-full border border-cb-terracotta-dark/30 bg-cb-peach/30 px-3 py-1 text-[11px] font-semibold text-cb-terracotta-dark transition hover:bg-cb-peach/60"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        {ar ? "أعد نفس الصندوق" : "Reorder same box"}
      </button>
    );
  }

  if (state === "loading") {
    return (
      <span className="inline-flex items-center gap-2 px-2 py-1 text-[11px] text-cb-text-muted">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cb-terracotta-dark/30 border-t-cb-terracotta-dark" />
        {ar ? "جاري التحضير…" : "Preparing…"}
      </span>
    );
  }

  if (state === "confirm" && snapshot) {
    return (
      <div className="mt-2 w-full rounded-xl border border-cb-terracotta-dark/30 bg-cb-peach/25 p-3 text-start">
        <p className="flex items-center gap-2 text-xs font-semibold text-cb-text-strong">
          <CheckCircle className="h-4 w-4 text-cb-terracotta-dark" aria-hidden />
          {ar
            ? `سيتم تحميل ${snapshot.totalItems} قطعة في منشئ الصندوق`
            : `${snapshot.totalItems} items will load in the box builder`}
        </p>
        <p className="mt-1 text-[11px] text-cb-text-muted">
          {snapshot.items.map((item) => (
            <span key={item.productId} className="me-2">
              {item.name} ×{item.quantity}
            </span>
          ))}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={confirmReorder}
            className="rounded-lg bg-cb-terracotta-dark px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            {ar ? "تأكيد والانتقال للبناء" : "Confirm & build"}
          </button>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="rounded-lg px-2 py-1.5 text-[11px] text-cb-text-muted"
          >
            {ar ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    );
  }

  if (state === "unavailable") {
    return (
      <div className="mt-2 w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-start">
        <p className="flex items-center gap-2 text-xs font-semibold text-amber-900">
          <AlertCircle className="h-4 w-4" aria-hidden />
          {ar ? "بعض المنتجات غير متوفرة" : "Some items are unavailable"}
        </p>
        <p className="mt-1 text-[11px] text-amber-800">{unavailable.join(ar ? "، " : ", ")}</p>
        <button
          type="button"
          className="mt-2 text-[11px] font-semibold text-cb-terracotta-dark underline"
          onClick={() => router.push("/gift-box/build")}
        >
          {ar ? "ابنِ صندوقاً جديداً" : "Build a new box"}
        </button>
      </div>
    );
  }

  return null;
}
