"use client";

import { Percent, ShoppingCart } from "lucide-react";
import type { ChatClientAction } from "@/lib/mr-brownie/chat-client-actions";
import { cn } from "@/lib/utils";

type MrBrownieChatClientActionStripProps = {
  actions: ChatClientAction[];
  locale: "ar" | "en";
  onAddToCart: (action: Extract<ChatClientAction, { type: "add_to_cart" }>) => void;
  onApplyPromo: (action: Extract<ChatClientAction, { type: "apply_promo" }>) => void;
  busyId?: string | null;
};

export function MrBrownieChatClientActionStrip({
  actions,
  locale,
  onAddToCart,
  onApplyPromo,
  busyId = null,
}: MrBrownieChatClientActionStripProps) {
  if (!actions.length) return null;

  return (
    <div className="cb-mr-brownie-client-actions flex flex-wrap gap-2 pt-2">
      {actions.map((action) => {
        const label = locale === "ar" ? action.label_ar : action.label_en;
        const busyKey = action.type === "add_to_cart" ? action.id : action.code;
        const isBusy = busyId === busyKey;
        if (action.type === "add_to_cart") {
          return (
            <button
              key={action.id}
              type="button"
              disabled={Boolean(busyId)}
              onClick={() => onAddToCart(action)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-[#5c3317]/25 bg-[#5c3317] px-3.5 py-2 text-xs font-semibold text-white shadow-sm",
                "transition-[transform,opacity] hover:-translate-y-px disabled:opacity-50",
              )}
            >
              <ShoppingCart className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {isBusy ? "…" : label}
            </button>
          );
        }
        return (
          <button
            key={action.code}
            type="button"
            disabled={Boolean(busyId)}
            onClick={() => onApplyPromo(action)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-[#d4a055]/50 bg-[#fff8eb] px-3.5 py-2 text-xs font-semibold text-[#5c3317] shadow-sm",
              "transition-[transform,opacity] hover:-translate-y-px disabled:opacity-50",
            )}
          >
            <Percent className="h-3.5 w-3.5 shrink-0 text-[#c9972a]" aria-hidden />
            {isBusy ? "…" : label}
          </button>
        );
      })}
    </div>
  );
}
