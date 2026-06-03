"use client";

import { useCallback, useState } from "react";
import { Tag, X, Loader2 } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

export type AppliedPromo = {
  code: string;
  discount_amount: number;
  type: "percent" | "fixed";
  value: number;
};

type Props = {
  cartSubtotal: number;
  applied: AppliedPromo | null;
  onApply: (promo: AppliedPromo) => void;
  onClear: () => void;
  className?: string;
};

export function PromoCodeField({ cartSubtotal, applied, onApply, onClear, className }: Props) {
  const { t, lang, formatPrice } = useLanguage();
  const [input, setInput] = useState(applied?.code ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const apply = useCallback(async () => {
    const code = input.trim();
    if (code.length < 3) {
      setErrorMsg(t("promo.errMinLength"));
      setStatus("error");
      return;
    }
    if (cartSubtotal <= 0) {
      setErrorMsg(t("promo.errEmptyCart"));
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, cart_total: cartSubtotal }),
      });
      const data = (await res.json()) as {
        valid?: boolean;
        discount_amount?: number;
        type?: "percent" | "fixed";
        value?: number;
        code?: string;
        error?: { ar?: string; en?: string };
      };

      if (!data.valid) {
        setErrorMsg(
          (lang === "ar" ? data.error?.ar : data.error?.en) ??
            data.error?.ar ??
            data.error?.en ??
            t("promo.errInvalid"),
        );
        setStatus("error");
        return;
      }

      onApply({
        code: data.code ?? code.toUpperCase(),
        discount_amount: data.discount_amount ?? 0,
        type: data.type ?? "percent",
        value: data.value ?? 0,
      });
      setStatus("idle");
      setErrorMsg(null);
    } catch {
      setErrorMsg(t("promo.errNetwork"));
      setStatus("error");
    }
  }, [input, cartSubtotal, onApply, t, lang]);

  const clear = useCallback(() => {
    setInput("");
    setErrorMsg(null);
    setStatus("idle");
    onClear();
  }, [onClear]);

  if (applied) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-sm">
          <Tag className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
          <span className="font-bold text-emerald-900 dark:text-emerald-100">{applied.code}</span>
          <span className="text-emerald-700 dark:text-emerald-300">
            −{formatPrice(applied.discount_amount)}
          </span>
        </div>
        <button
          type="button"
          onClick={clear}
          className="rounded-full p-1 text-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
          aria-label={t("promo.removeAria")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value.toUpperCase());
            if (status === "error") setStatus("idle");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void apply();
            }
          }}
          placeholder={t("promo.placeholder")}
          className="min-w-0 flex-1 rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-2.5 text-sm font-semibold uppercase tracking-wide outline-none focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus"
          aria-label={t("promo.inputAria")}
        />
        <button
          type="button"
          disabled={status === "loading"}
          onClick={() => void apply()}
          className={buttonClassName("outline", "shrink-0 rounded-2xl px-4 py-2.5 text-sm")}
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            t("promo.apply")
          )}
        </button>
      </div>
      {errorMsg ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {errorMsg}
        </p>
      ) : null}
    </div>
  );
}
