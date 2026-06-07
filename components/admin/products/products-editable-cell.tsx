"use client";

import { useEffect, useRef, useState } from "react";
import type { InlineEditableField } from "@/lib/admin/products-inline-edit";
import { validatePendingEdit } from "@/lib/admin/products-inline-edit";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  field: InlineEditableField;
  value: string;
  displayValue?: string;
  disabled?: boolean;
  inputMode?: "text" | "numeric" | "decimal";
  className?: string;
  onChange: (value: string) => void;
  onFocusCell?: (productId: string, field: InlineEditableField) => void;
  isDirty?: boolean;
  hasError?: boolean;
};

export function ProductsEditableCell({
  productId,
  field,
  value,
  displayValue,
  disabled,
  inputMode = "text",
  className,
  onChange,
  onFocusCell,
  isDirty,
  hasError,
}: Props) {
  const [local, setLocal] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const commit = () => {
    const validated = validatePendingEdit(field, local);
    if (!validated.ok) {
      setError(validated.message);
      return;
    }
    setError(null);
    onChange(validated.value);
  };

  if (disabled) {
    return (
      <span className={cn("text-sm tabular-nums text-cb-text-muted", className)}>
        {(displayValue ?? value) || "—"}
      </span>
    );
  }

  return (
    <div className="min-w-[4.5rem]">
      <input
        ref={inputRef}
        type="text"
        inputMode={inputMode}
        value={local}
        aria-label={`تعديل ${field}`}
        data-product-id={productId}
        data-edit-field={field}
        className={cn(
          "w-full min-w-0 rounded-lg border bg-cb-surface px-2 py-1.5 text-sm font-semibold tabular-nums",
          "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
          isDirty
            ? "border-amber-400 bg-amber-50/80 dark:border-amber-700 dark:bg-amber-950/30"
            : "border-cb-border hover:border-cb-brand-300",
          (hasError || error) && "border-red-400 bg-red-50/80 dark:border-red-700 dark:bg-red-950/30",
          className,
        )}
        onFocus={() => onFocusCell?.(productId, field)}
        onChange={(e) => {
          setLocal(e.target.value);
          if (error) setError(null);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            inputRef.current?.blur();
          }
          if (e.key === "Escape") {
            setLocal(value);
            setError(null);
            inputRef.current?.blur();
          }
        }}
      />
      {error ? <p className="mt-0.5 text-[10px] font-medium text-red-700 dark:text-red-300">{error}</p> : null}
    </div>
  );
}
