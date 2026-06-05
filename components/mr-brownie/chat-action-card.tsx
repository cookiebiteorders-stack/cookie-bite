"use client";

import Link from "next/link";
import { Gift, HelpCircle, Package, ShoppingCart } from "lucide-react";
import {
  actionCardLabel,
  type ChatActionCard,
} from "@/lib/mr-brownie/action-cards";
import { cn } from "@/lib/utils";

const ICONS = {
  package: Package,
  help: HelpCircle,
  cart: ShoppingCart,
  gift: Gift,
} as const;

type MrBrownieChatActionStripProps = {
  cards: ChatActionCard[];
  locale: "ar" | "en";
  onCardClick?: (card: ChatActionCard) => void;
};

export function MrBrownieChatActionStrip({
  cards,
  locale,
  onCardClick,
}: MrBrownieChatActionStripProps) {
  if (!cards.length) return null;

  return (
    <div className="cb-mr-brownie-action-strip flex flex-wrap gap-2 pt-2">
      {cards.map((card) => {
        const Icon = ICONS[card.icon] ?? Package;
        return (
          <Link
            key={card.id}
            href={card.path}
            onClick={() => onCardClick?.(card)}
            className={cn(
              "cb-mr-brownie-action-card inline-flex items-center gap-2 rounded-full border border-[#5c3317]/20",
              "bg-white/95 px-3.5 py-2 text-xs font-semibold text-[#5c3317] shadow-sm",
              "transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-md",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-[#d4a055]" aria-hidden />
            {actionCardLabel(card, locale)}
          </Link>
        );
      })}
    </div>
  );
}
