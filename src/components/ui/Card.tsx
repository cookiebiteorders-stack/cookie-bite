import { cn } from "@/lib/utils";

type Variant = "default" | "elevated" | "ghost" | "product" | "featured";

const variants: Record<Variant, string> = {
  default: "bg-cb-surface border-cb-border",
  elevated: "bg-cb-surface-elevated border-cb-border-strong shadow-lg",
  ghost: "bg-transparent border-cb-border/70",
  product: "bg-cb-surface border-cb-border hover:-translate-y-0.5 hover:shadow-lg",
  featured: "bg-cb-surface-elevated border-cb-border-strong shadow-xl",
};

export function Card({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border p-4 transition-[transform,box-shadow,border-color] duration-200",
        variants[variant],
        className,
      )}
    >
      {children}
    </article>
  );
}

