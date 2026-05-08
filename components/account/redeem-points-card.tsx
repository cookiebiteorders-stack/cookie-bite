"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";

type Props = {
  points: number;
};

export function RedeemPointsCard({ points }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<null | { kind: "ok" | "err"; text: string }>(
    null,
  );

  const redeemPoints = 100;
  const canRedeem = points >= redeemPoints;

  async function onRedeem() {
    if (!canRedeem || loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: redeemPoints }),
      });

      const data = (await res.json().catch(() => null)) as
        | { error?: { en?: string; ar?: string } }
        | { ok?: boolean; discount_egp?: number; remaining_points?: number }
        | null;

      if (!res.ok) {
        const ar = data && "error" in data ? data.error?.ar : undefined;
        throw new Error(ar ?? "فشل استبدال النقاط");
      }

      const discount = data && "discount_egp" in data ? data.discount_egp : null;
      const remaining =
        data && "remaining_points" in data ? data.remaining_points : null;

      setMessage({
        kind: "ok",
        text:
          discount != null && remaining != null
            ? `تم الاستبدال بنجاح. خصم ${discount} EGP. المتبقي: ${remaining} نقطة.`
            : "تم الاستبدال بنجاح.",
      });

      // تحديث الصفحة لتحديث النقاط والـ Tier.
      router.refresh();
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof Error ? err.message : "خطأ" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl bg-cb-cream p-4 ring-1 ring-cb-border">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-cb-text-strong">
            استبدال نقاطك
          </p>
          <p className="mt-1 text-xs text-cb-text-muted">
            كل {redeemPoints} نقطة = خصم جاهز على الطلب.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-cb-terracotta-dark">
            {Math.floor(points)} pts
          </p>
          <p className="text-[11px] font-semibold text-cb-text-muted">
            {canRedeem ? "جاهز الآن" : `تبقى ${redeemPoints - Math.floor(points)} pts`}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRedeem}
        disabled={!canRedeem || loading}
        className={buttonClassName(
          "primary",
          "mt-4 w-full disabled:opacity-60 disabled:cursor-not-allowed",
        )}
      >
        {loading ? "جاري الاستبدال..." : `استبدال ${redeemPoints} نقطة`}
      </button>

      {message ? (
        <div
          className={
            message.kind === "ok"
              ? "mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              : "mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800"
          }
          role="status"
        >
          {message.text}
        </div>
      ) : null}
    </div>
  );
}

