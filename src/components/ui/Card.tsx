import { cn } from "@/lib/utils";

type Variant = "default" | "elevated" | "ghost" | "product" | "featured";

const variants: Record<Variant, string> = {
  default: "bg-cb-surface border-cb-border text-cb-text",
  elevated: "bg-cb-surface-elevated border-cb-border-strong text-cb-text shadow-lg",
  ghost: "bg-transparent border-cb-border/80 text-cb-text",
  product: "bg-cb-surface border-cb-border text-cb-text hover:-translate-y-0.5 hover:shadow-lg",
  featured: "bg-cb-surface-elevated border-cb-border-strong text-cb-text shadow-xl",
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

