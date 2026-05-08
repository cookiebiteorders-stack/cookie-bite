"use client";

import { Minus, Plus } from "lucide-react";

type Props = {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
};

export function QuantitySelector({ quantity, onDecrease, onIncrease }: Props) {
  return (
    <div className="inline-flex h-10 items-center rounded-md border border-cb-border">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center text-cb-text-strong hover:bg-cb-hover-overlay"
        onClick={onDecrease}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-9 text-center text-sm font-semibold text-cb-text-strong">
        {quantity}
      </span>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center text-cb-text-strong hover:bg-cb-hover-overlay"
        onClick={onIncrease}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

