import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "outline" | "ghost" | "subtle" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--cb-btn-primary-bg)] text-[var(--cb-btn-primary-text)] no-underline shadow-md shadow-black/10 hover:bg-[var(--cb-btn-primary-hover)] hover:text-white active:scale-[0.98]",
  outline:
    "border-2 border-[var(--cb-btn-secondary-border)] bg-transparent text-[var(--cb-btn-secondary-text)] hover:bg-[color-mix(in_oklab,var(--cb-luxury-gold)_12%,transparent)] hover:border-[var(--cb-luxury-gold-hover)]",
  ghost:
    "border border-transparent text-cb-text-strong hover:bg-cb-surface-2",
  subtle:
    "border border-cb-border bg-cb-surface-elevated text-cb-text-strong shadow-sm hover:bg-cb-surface-2",
  danger:
    "bg-cb-danger text-white shadow-sm hover:brightness-95 active:scale-[0.98]",
};

const baseClasses =
  "cb-touch-manipulation inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-[background-color,transform,border-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cb-luxury-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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
