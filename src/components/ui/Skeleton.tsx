import { cn } from "@/lib/utils";

type Shape = "text" | "rect" | "circle" | "card";

const shapeClasses: Record<Shape, string> = {
  text: "h-4 w-full rounded",
  rect: "h-28 w-full rounded-lg",
  circle: "h-10 w-10 rounded-full",
  card: "h-48 w-full rounded-xl",
};

export function Skeleton({
  shape = "rect",
  className,
}: {
  shape?: Shape;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-cb-surface via-cb-surface-elevated to-cb-surface",
        shapeClasses[shape],
        className,
      )}
    />
  );
}

