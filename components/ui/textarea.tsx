"use client";

import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type TextareaProps = ComponentProps<"textarea"> & {
  label?: string;
  hint?: string;
  error?: string;
};

/**
 * Labelled multi-line input with the same a11y wiring as Input (label ↔ control,
 * aria-describedby, aria-invalid; the hint is dropped once there is an error).
 */
export function Textarea({ label, hint, error, id, className, ref, ...props }: TextareaProps) {
  const generatedId = useId();
  const areaId = id ?? generatedId;
  const hintId = `${areaId}-hint`;
  const errorId = `${areaId}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={areaId} className="text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "rounded-sm border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-ring",
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
