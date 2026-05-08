import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "outline" | "ghost" | "subtle";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-cb-terracotta text-white shadow-sm hover:bg-cb-terracotta-dark active:bg-cb-terracotta-dark",
  outline:
    "border-2 border-cb-terracotta text-cb-terracotta bg-transparent hover:bg-cb-peach/60 hover:border-cb-terracotta-dark hover:text-cb-terracotta-dark",
  ghost:
    "text-cb-text hover:bg-cb-peach/60 border border-transparent",
  subtle:
    "bg-cb-peach/70 text-cb-text-strong hover:bg-cb-peach border border-cb-peach-deep/60",
};

const baseClasses =
  "cb-touch-manipulation inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-[background-color,transform,border-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cb-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function buttonClassName(
  variant: ButtonVariant = "primary",
  className?: string,
) {
  return cn(baseClasses, variantClasses[variant], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonClassName(variant, className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";
