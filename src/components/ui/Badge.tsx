import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "error" | "accent" | "outline";

const variants: Record<Variant, string> = {
  default: "bg-cb-surface-elevated text-cb-text-strong border-cb-border",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  error: "bg-red-500/15 text-red-300 border-red-500/40",
  accent: "bg-cb-terracotta-dark text-white border-cb-terracotta-dark",
  outline: "bg-transparent text-cb-text-strong border-cb-border-strong",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

