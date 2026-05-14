import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "outline" | "ghost" | "subtle";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--cb-btn-primary-bg)] text-white no-underline shadow-sm hover:brightness-110 hover:text-white active:brightness-95",
  outline:
    "border-2 border-cb-border text-cb-text-strong bg-transparent hover:bg-cb-surface-2 hover:border-cb-border-strong hover:text-cb-text-strong",
  ghost:
    "text-cb-text-strong hover:bg-cb-surface-2 border border-transparent",
  subtle:
    "bg-cb-surface-2 text-cb-text-strong hover:bg-cb-peach border border-cb-border",
};

const baseClasses =
  "cb-touch-manipulation inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-[background-color,transform,border-color,color,box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cb-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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
