"use client";

import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type SelectProps = ComponentProps<"select"> & {
  label?: string;
  hint?: string;
  error?: string;
};

/**
 * Labelled select with hint/error and the same a11y wiring as Input (label ↔
 * control, aria-describedby, aria-invalid; the hint is dropped once there is an
 * error to avoid a dangling aria reference). 44px min height; 16px text avoids
 * iOS zoom.
 */
export function Select({ label, hint, error, id, className, children, ref, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = `${selectId}-hint`;
  const errorId = `${selectId}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-11 rounded-sm border bg-surface px-3 text-base text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring",
          error ? "border-danger" : "border-border",
          className,
        )}
        {...props}
      >
        {children}
      </select>
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
