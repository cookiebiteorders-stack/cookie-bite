"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AuthInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, id, label, error, hint, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <label className="flex w-full flex-col gap-2">
        <span className="text-sm font-semibold text-cb-text-strong">{label}</span>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-12 w-full rounded-xl border border-cb-border bg-cb-surface px-4 text-base text-cb-text-strong",
            "placeholder:text-cb-text-muted focus:border-cb-brand-logo focus:outline-none focus:ring-4 focus:ring-cb-brand-logo/15",
            "transition-[border-color,box-shadow,background-color] duration-200",
            error ? "border-red-500 focus:border-red-500 focus:ring-red-200" : "",
            className,
          )}
          {...props}
        />
        {error ? (
          <span className="text-xs font-medium text-red-700">{error}</span>
        ) : hint ? (
          <span className="text-xs text-cb-text-muted">{hint}</span>
        ) : null}
      </label>
    );
  },
);

AuthInput.displayName = "AuthInput";

