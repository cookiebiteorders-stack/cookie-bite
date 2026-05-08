import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "default" | "search" | "error";
type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-9 text-sm",
  md: "h-11 text-sm",
  lg: "h-12 text-base",
};

const variantClasses: Record<Variant, string> = {
  default: "border-cb-border focus-within:border-cb-border-strong",
  search: "border-cb-border focus-within:border-cb-terracotta-dark",
  error: "border-red-500/70 focus-within:border-red-500",
};

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  variant?: Variant;
  inputSize?: Size;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

export function Input({
  variant = "default",
  inputSize = "md",
  leftIcon,
  rightSlot,
  className,
  ...props
}: Props) {
  const icon = variant === "search" && !leftIcon ? <Search className="h-4 w-4" /> : leftIcon;
  return (
    <label
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border bg-cb-surface-elevated px-3 transition",
        sizeClasses[inputSize],
        variantClasses[variant],
      )}
    >
      {icon ? <span className="text-cb-text-muted">{icon}</span> : null}
      <input
        {...props}
        className={cn(
          "w-full bg-transparent text-cb-text-strong outline-none placeholder:text-cb-text-muted",
          className,
        )}
      />
      {rightSlot}
    </label>
  );
}

