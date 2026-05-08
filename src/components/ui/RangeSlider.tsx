"use client";

type Props = {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
};

export function RangeSlider({ min, max, value, onChange }: Props) {
  const [from, to] = value;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={from}
          onChange={(e) => onChange([Math.min(Number(e.target.value), to), to])}
          aria-label={`Minimum price ${from}`}
          className="w-full accent-cb-terracotta-dark"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={to}
          onChange={(e) => onChange([from, Math.max(Number(e.target.value), from)])}
          aria-label={`Maximum price ${to}`}
          className="w-full accent-cb-terracotta-dark"
        />
      </div>
      <div className="flex items-center justify-between text-xs text-cb-text-muted">
        <span>${from}</span>
        <span>${to}</span>
      </div>
    </div>
  );
}

