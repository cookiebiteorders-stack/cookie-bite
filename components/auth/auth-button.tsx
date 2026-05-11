"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AuthButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export const AuthButton = React.forwardRef<HTMLButtonElement, AuthButtonProps>(
  ({ className, children, loading = false, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-base font-bold",
        "bg-[var(--cb-btn-primary-bg)] text-[var(--cb-btn-primary-text)] shadow-sm",
        "transition-[transform,filter,box-shadow] duration-200 hover:brightness-105 active:scale-[0.99]",
        "focus:outline-none focus:ring-4 focus:ring-cb-brand-logo/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  ),
);

AuthButton.displayName = "AuthButton";

