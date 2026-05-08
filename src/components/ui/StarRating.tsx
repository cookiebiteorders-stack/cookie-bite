import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  rating,
  count,
  className,
}: {
  rating: number;
  count?: number;
  className?: string;
}) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < full || (i === full && half);
          return (
            <Star
              key={i}
              className={cn("h-3.5 w-3.5", filled ? "fill-current text-amber-400" : "text-cb-text-muted")}
            />
          );
        })}
      </div>
      {count != null ? <span className="text-xs text-cb-text-muted">({count})</span> : null}
    </div>
  );
}

