"use client";

import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type InputProps = ComponentProps<"input"> & {
  label?: string;
  hint?: string;
  error?: string;
};

/**
 * Labelled text input with hint/error and correct a11y wiring (label ↔ input,
 * aria-describedby, aria-invalid). 44px min height; 16px text avoids iOS zoom.
 */
export function Input({
  label,
  hint,
  error,
  id,
  className,
  ref,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-11 rounded-sm border bg-surface px-3 text-base text-foreground placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-ring",
          error ? "border-danger" : "border-border",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-xs text-danger">
          <span aria-hidden="true">✕</span>
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
